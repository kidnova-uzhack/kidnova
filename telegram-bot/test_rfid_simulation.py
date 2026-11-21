"""Software-only RFID screening tests; no hardware or Telegram calls."""
import http.client
import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import bot
from arrival import server
import rfid_identity


class RFIDSimulationTests(unittest.TestCase):
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
            db.executescript(
                "CREATE TABLE profiles(user INTEGER PRIMARY KEY,name TEXT,age INTEGER);"
                "CREATE TABLE records(id INTEGER PRIMARY KEY,user INTEGER,temperature REAL,"
                "symptoms TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);"
                "INSERT INTO profiles VALUES(700001,'Synthetic KidNova Child',48);")
            rfid_identity.init_db(db)
            self.tag = 'KN-RFID-SIM:CHILD_0001'
            rfid_identity.assign(db, 700001, self.tag)
        server.init_db()
        self.data = {
            'event_id': 'rfid-screening-001',
            'rfid_tag': self.tag,
            'measured_at': datetime.now(timezone.utc).isoformat(),
            'temperature_c': 36.6,
            'result': 'in_range',
        }

    def test_normal_temperature_records_screening_then_attendance_preview(self):
        self.assertTrue(server.enqueue(self.data, {}, self.profile_db))
        with sqlite3.connect(self.profile_db) as db:
            screening = db.execute(
                'SELECT id,user,temperature,source,event_id,created FROM records').fetchone()
            attendance = db.execute(
                'SELECT event_id,user,checked_in_at,method,screening_record_id '
                'FROM attendance_events').fetchone()
        self.assertEqual(screening[1:5],
                         (700001, 36.6, 'rfid_simulation', 'rfid-screening-001'))
        self.assertEqual(attendance,
                         ('rfid-screening-001', 700001, screening[5],
                          'rfid_simulation', screening[0]))
        with server.connect() as db:
            chat, message, mode, sent = db.execute(
                'SELECT chat_id,message,delivery_mode,sent FROM outbox').fetchone()
        self.assertEqual((chat, mode, sent), (700001, 'preview', 0))
        self.assertIn('36.6 °C', message)
        self.assertLess(message.index('harorat'), message.index('Davomat'))
        self.assertNotIn(self.tag, message)
        with patch.object(server, 'send_telegram') as send:
            self.assertFalse(server.deliver_once('not-a-real-token'))
            send.assert_not_called()

    def test_elevated_temperature_marks_attention_in_screening_and_preview(self):
        data = dict(self.data, event_id='rfid-screening-elevated',
                    temperature_c=38.2, result='attention')
        self.assertTrue(server.enqueue(data, {}, self.profile_db))
        with sqlite3.connect(self.profile_db) as db:
            temperature, note = db.execute(
                'SELECT temperature,symptoms FROM records').fetchone()
        self.assertEqual(temperature, 38.2)
        self.assertIn('xodim tekshiruvi', note)
        with server.connect() as db:
            message, mode = db.execute(
                'SELECT message,delivery_mode FROM outbox').fetchone()
        self.assertIn('38.2 °C', message)
        self.assertIn('xodim tekshiruvini', message)
        self.assertEqual(mode, 'preview')

    def test_unknown_rfid_creates_no_screening_attendance_or_preview(self):
        data = dict(self.data, event_id='rfid-screening-unknown',
                    rfid_tag='KN-RFID-SIM:UNKNOWN_9999')
        with self.assertRaisesRegex(ValueError, 'Unknown or revoked'):
            server.enqueue(data, {}, self.profile_db)
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 0)
            self.assertEqual(db.execute(
                'SELECT count(*) FROM attendance_events').fetchone()[0], 0)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 0)

    def test_duplicate_checkin_is_idempotent_and_collision_is_rejected(self):
        self.assertTrue(server.enqueue(self.data, {}, self.profile_db))
        self.assertFalse(server.enqueue(self.data, {}, self.profile_db))
        with self.assertRaisesRegex(ValueError, 'already used'):
            server.enqueue(dict(self.data, temperature_c=37.1), {}, self.profile_db)
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 1)
            self.assertEqual(db.execute(
                'SELECT count(*) FROM attendance_events').fetchone()[0], 1)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 1)


class RFIDEndToEndHTTPTests(unittest.TestCase):
    """Exercise HTTP input through both SQLite stores with delivery disabled."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        folder = Path(self.temp.name)
        self.profile_db = folder / 'profiles.db'
        self.arrival_db = folder / 'arrival.db'
        self.children_file = folder / 'children.json'
        self.children_file.write_text('{}')
        self.tag = 'KN-RFID-SIM:E2E_CHILD_01'
        with sqlite3.connect(self.profile_db) as db:
            db.executescript(
                "CREATE TABLE profiles(user INTEGER PRIMARY KEY,name TEXT,age INTEGER);"
                "CREATE TABLE records(id INTEGER PRIMARY KEY,user INTEGER,temperature REAL,"
                "symptoms TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);"
                "INSERT INTO profiles VALUES(800001,'Synthetic E2E Child',60);")
            rfid_identity.init_db(db)
            rfid_identity.assign(db, 800001, self.tag)
        self.db_patch = patch.object(server, 'DB', str(self.arrival_db))
        self.worker_patch = patch.object(server, 'worker')
        self.send_patch = patch.object(server, 'send_telegram')
        self.db_patch.start()
        self.worker_patch.start()
        self.send_mock = self.send_patch.start()
        self.httpd = server.start(
            'not-a-real-token', 'x' * 32, self.children_file, port=0,
            profile_db=self.profile_db)
        self.base = {
            'event_id': 'e2e-normal-001',
            'rfid_tag': self.tag,
            'measured_at': datetime.now(timezone.utc).isoformat(),
            'temperature_c': 36.6,
            'result': 'in_range',
        }

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.send_mock.assert_not_called()
        self.send_patch.stop()
        self.worker_patch.stop()
        self.db_patch.stop()
        self.temp.cleanup()

    def post(self, payload):
        connection = http.client.HTTPConnection(
            '127.0.0.1', self.httpd.server_port, timeout=5)
        try:
            connection.request('POST', '/arrival', json.dumps(payload), {
                'Authorization': 'Bearer ' + 'x' * 32,
                'Content-Type': 'application/json',
            })
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def assert_empty_stores(self):
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 0)
            self.assertEqual(db.execute(
                'SELECT count(*) FROM attendance_events').fetchone()[0], 0)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 0)

    def test_normal_and_elevated_readings_complete_full_preview_flow(self):
        status, body = self.post(self.base)
        self.assertEqual((status, body['status']), (202, 'queued'))
        elevated = dict(self.base, event_id='e2e-elevated-001',
                        temperature_c=38.2, result='attention')
        status, body = self.post(elevated)
        self.assertEqual((status, body['status']), (202, 'queued'))

        with sqlite3.connect(self.profile_db) as db:
            records = db.execute(
                'SELECT temperature,symptoms,source,event_id FROM records ORDER BY id').fetchall()
            attendance = db.execute(
                'SELECT event_id,checked_in_at,screening_record_id '
                'FROM attendance_events ORDER BY screening_record_id').fetchall()
        self.assertEqual([row[0] for row in records], [36.6, 38.2])
        self.assertEqual([row[2] for row in records], ['rfid_simulation'] * 2)
        self.assertIn('belgilangan oraliqda', records[0][1])
        self.assertIn('xodim tekshiruvi', records[1][1])
        self.assertEqual([row[0] for row in attendance],
                         ['e2e-normal-001', 'e2e-elevated-001'])
        self.assertTrue(all(row[1] for row in attendance))

        with server.connect() as db:
            previews = db.execute(
                'SELECT event_id,message,delivery_mode,sent FROM outbox ORDER BY rowid').fetchall()
        self.assertEqual([(row[2], row[3]) for row in previews],
                         [('preview', 0), ('preview', 0)])
        self.assertIn('36.6 °C', previews[0][1])
        self.assertIn('38.2 °C', previews[1][1])
        self.assertIn('xodim tekshiruvini talab qiladi', previews[1][1])
        self.assertIn('tibbiy tashxis emas', previews[1][1])
        self.assertNotIn(self.tag, previews[0][1] + previews[1][1])
        self.assertFalse(server.deliver_once('not-a-real-token'))

        messages = []
        with sqlite3.connect(self.profile_db) as db:
            app = bot.Bot(db, lambda *args: messages.append(args))
            app.has_consent = lambda user: True
            app.handle({'chat': {'id': 800001, 'type': 'private'}, 'text': '📊 Tarix'})
        self.assertIn('36.6 °C', messages[-1][1])
        self.assertIn('38.2 °C', messages[-1][1])
        self.assertIn('xodim tekshiruvi', messages[-1][1])

    def test_unknown_rfid_is_rejected_without_partial_writes(self):
        payload = dict(self.base, event_id='e2e-unknown-001',
                       rfid_tag='KN-RFID-SIM:UNKNOWN_E2E')
        status, body = self.post(payload)
        self.assertEqual(status, 400)
        self.assertIn('Unknown or revoked', body['error'])
        self.assert_empty_stores()

    def test_duplicate_is_idempotent_and_changed_collision_is_rejected(self):
        self.assertEqual(self.post(self.base), (202, {'status': 'queued'}))
        self.assertEqual(self.post(self.base), (202, {'status': 'already_accepted'}))
        status, body = self.post(dict(self.base, temperature_c=37.1))
        self.assertEqual(status, 400)
        self.assertIn('already used', body['error'])
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 1)
            self.assertEqual(db.execute(
                'SELECT count(*) FROM attendance_events').fetchone()[0], 1)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 1)

    def test_missing_or_null_temperature_is_rejected_without_writes(self):
        missing = dict(self.base)
        del missing['temperature_c']
        status, body = self.post(missing)
        self.assertEqual(status, 400)
        self.assertIn('Invalid RFID simulation fields', body['error'])
        null_reading = dict(self.base, event_id='e2e-null-temperature',
                            temperature_c=None)
        status, body = self.post(null_reading)
        self.assertEqual(status, 400)
        self.assertIn('Invalid temperature', body['error'])
        self.assert_empty_stores()

    def test_database_error_returns_retryable_response_and_rolls_back(self):
        with sqlite3.connect(self.profile_db) as db:
            db.execute('DROP TABLE attendance_events')
        status, body = self.post(dict(self.base, event_id='e2e-db-error'))
        self.assertEqual((status, body),
                         (503, {'error': 'Temporary error; retry same event_id'}))
        with sqlite3.connect(self.profile_db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0], 0)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0], 0)


if __name__ == '__main__':
    unittest.main()
