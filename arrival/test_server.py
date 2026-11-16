import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from arrival import server

class ArrivalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.patch = patch.object(server, 'DB', str(Path(self.temp.name) / 'test.db'))
        self.patch.start()
        server.init_db()
        self.children = {'a': {'name': 'Ali', 'chat_id': 123}}
        self.data = dict(event_id='event-1', child_id='a', measured_at=datetime.now(timezone.utc).isoformat(), temperature_c=36.6, result='in_range')
    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()
    def test_worker_survives_unexpected_error(self):
        calls=[]
        def flaky(token):
            calls.append(1)
            if len(calls)==1:raise server.sqlite3.OperationalError('database is locked')
            raise KeyboardInterrupt
        with patch.object(server,'deliver_once',side_effect=flaky), patch.object(server.time,'sleep'), patch('builtins.print'):
            with self.assertRaises(KeyboardInterrupt):server.worker('fake-token')
        self.assertEqual(len(calls),2)
    def test_start_without_children_file(self):
        folder = Path(self.temp.name)
        profile = folder / 'profile.db'
        import sqlite3
        with sqlite3.connect(str(profile)) as db:
            db.execute('CREATE TABLE profiles(user INTEGER PRIMARY KEY, name TEXT, age INTEGER)')
            db.execute('CREATE TABLE records(id INTEGER PRIMARY KEY, user INTEGER, temperature REAL, symptoms TEXT, created TEXT)')
        with patch.object(server.threading, 'Thread'), patch('builtins.print'):
            httpd = server.start('fake-token', 'x' * 32, folder / 'missing.json', port=0, profile_db=profile)
        httpd.server_close()
    def test_routing_and_message(self):
        chat, text, _ = server.prepare(self.data, self.children)
        self.assertEqual(chat, 123)
        self.assertIn('36.6', text)
        self.assertIn('Ali', text)
        self.assertNotIn('sog‘lom', text)
    def test_repeated_event_only_one_message(self):
        self.assertTrue(server.enqueue(self.data, self.children))
        self.assertFalse(server.enqueue(self.data, self.children))
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0], 1)
    def test_collision_rejected(self):
        server.enqueue(self.data, self.children)
        with self.assertRaises(ValueError):
            server.enqueue(dict(self.data, temperature_c=37), self.children)
    def test_unknown_child(self):
        with self.assertRaises(ValueError):
            server.prepare(dict(self.data, child_id='unknown'), self.children)
    def test_bad_measurement(self):
        for value in [float('nan'), True, 100, '36.6']:
            with self.assertRaises(ValueError):
                server.prepare(dict(self.data, temperature_c=value), self.children)
    def test_attention_and_invalid(self):
        self.assertIn('e’tibori kerak', server.prepare(dict(self.data, result='attention'), self.children)[1])
        self.assertIn('qayta tekshirishi', server.prepare(dict(self.data, result='invalid'), self.children)[1])

if __name__ == '__main__':
    unittest.main()
