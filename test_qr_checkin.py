"""Synthetic QR check-ins; no real Telegram calls or production databases."""
import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import qr_identity
import bot
from arrival import server


class QRCheckinTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        folder = Path(self.temp.name)
        self.profile_db = folder / 'profiles.db'
        self.arrival_db = folder / 'arrival.db'
        self.db_patch = patch.object(server, 'DB', str(self.arrival_db))
        self.db_patch.start()
        self.addCleanup(self.db_patch.stop)
        with sqlite3.connect(self.profile_db) as db:
            db.executescript("CREATE TABLE profiles(user INTEGER PRIMARY KEY,name TEXT,age INTEGER);"
                             "CREATE TABLE records(id INTEGER PRIMARY KEY,user INTEGER,temperature REAL,symptoms TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);"
                             "INSERT INTO profiles VALUES(111,'Synthetic Ali',36);"
                             "INSERT INTO profiles VALUES(222,'Synthetic Madina',48);"
                             "INSERT INTO records(user,temperature,symptoms) VALUES(111,36.5,'Manual entry');")
            qr_identity.init_db(db)
            self.token = qr_identity.generate_token()
            qr_identity.issue(db, 111, self.token)
        server.init_db()
        self.data = {'event_id': 'scan-1', 'qr_token': self.token,
                     'measured_at': datetime.now(timezone.utc).isoformat(),
                     'temperature_c': 36.7, 'result': 'in_range'}

    def test_checkin_records_screening_and_queues_one_notification(self):
        self.assertTrue(server.enqueue(self.data, {}, self.profile_db))
        self.assertFalse(server.enqueue(self.data, {}, self.profile_db))
        with sqlite3.connect(self.profile_db) as db:
            rows = db.execute('SELECT user,temperature,symptoms,source,event_id FROM records ORDER BY id').fetchall()
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0][2], 'Manual entry')
            self.assertEqual(rows[1][0], 111)
            self.assertEqual(rows[1][1], 36.7)
            self.assertEqual(rows[1][3:], ('qr_checkin', 'scan-1'))
            self.assertEqual(db.execute('SELECT name FROM profiles WHERE user=222').fetchone()[0], 'Synthetic Madina')
        with server.connect() as db:
            row = db.execute('SELECT chat_id,message,sent FROM outbox').fetchone()
            self.assertEqual(row[0], 111)
            self.assertIn('Synthetic Ali', row[1])
            self.assertEqual(row[2], 0)
            self.assertNotIn(self.token, row[1])
        with sqlite3.connect(self.profile_db) as db:
            sent = []
            app = bot.Bot(db, lambda *args: sent.append(args))
            app.handle({'chat': {'id': 111, 'type': 'private'}, 'text': '📊 Tarix'})
            self.assertIn('36.7 °C', sent[-1][1])
            self.assertIn('QR tekshiruv', sent[-1][1])
            self.assertIn('Manual entry', sent[-1][1])

    def test_invalid_rotated_and_unknown_qr_cannot_create_screening(self):
        with sqlite3.connect(self.profile_db) as db:
            self.assertNotIn(self.token, ''.join(row[0] for row in db.execute('SELECT token_hash FROM qr_credentials')))
            qr_identity.issue(db, 111, qr_identity.generate_token())
        with self.assertRaises(ValueError):
            server.enqueue(self.data, {}, self.profile_db)
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 1)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 0)

    def test_collision_and_revocation(self):
        server.enqueue(self.data, {}, self.profile_db)
        with self.assertRaises(ValueError):
            server.enqueue(dict(self.data, temperature_c=38.2), {}, self.profile_db)
        with sqlite3.connect(self.profile_db) as db:
            qr_identity.revoke(db, 111)
        with self.assertRaises(ValueError):
            server.enqueue(dict(self.data, event_id='scan-2'), {}, self.profile_db)

    def test_authenticated_http_checkin_never_sends_real_telegram(self):
        import http.client
        with patch.object(server, 'worker'), patch.object(server, 'send_telegram') as send:
            httpd = server.start('fake-token', 'x' * 32, port=0, profile_db=self.profile_db,
                                 children_file=self._empty_children_file())
            try:
                conn = http.client.HTTPConnection('127.0.0.1', httpd.server_port, timeout=5)
                for auth, expected in [('Bearer wrong', 401), ('Bearer ' + 'x' * 32, 202)]:
                    conn.request('POST', '/arrival', json.dumps(self.data),
                                 {'Authorization': auth, 'Content-Type': 'application/json'})
                    response = conn.getresponse()
                    response.read()
                    self.assertEqual(response.status, expected)
                conn.close()
                send.assert_not_called()
            finally:
                httpd.shutdown()
                httpd.server_close()

    def _empty_children_file(self):
        path = Path(self.temp.name) / 'children.json'
        path.write_text('{}')
        return path


if __name__ == '__main__':
    unittest.main()
