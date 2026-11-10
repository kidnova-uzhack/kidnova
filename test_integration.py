import http.client
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import bot
from arrival import server
from arrival.test_server import ArrivalTests


class BotIntegrationTests(unittest.TestCase):
    def test_existing_profile_and_year_input(self):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.executescript("CREATE TABLE profiles(user INTEGER PRIMARY KEY, name TEXT, age INTEGER);"
                         "INSERT INTO profiles VALUES(1,'Ali',18);")
        messages = []
        app = bot.Bot(db, lambda *args: messages.append(args))
        def say(text, user=1):
            app.handle({'chat': {'id': user, 'type': 'private'}, 'text': text})
        say('👶 Bola profili')
        self.assertIn('1 yosh 6 oy', messages[-1][1])
        say('📅 Yosh'); say('2')
        self.assertEqual(db.execute('SELECT age FROM profiles WHERE user=1').fetchone()[0], 24)
        say('🏫 Bog‘chaga kelish')
        self.assertIn('chat ID: 1', messages[-1][1])
        self.assertIs(messages[-1][2], bot.MENU)
        say('/arrival', user=2)
        self.assertIn('chat ID: 2', messages[-1][1])
        self.assertNotIn('Ali', messages[-1][1])

    def test_start_uses_local_settings(self):
        with patch.object(bot, 'load_settings', return_value={
            'DEVICE_API_KEY': 'x' * 32, 'ARRIVAL_PORT': '8089'
        }), patch.object(server, 'start') as start:
            bot.start_arrivals('fake-token')
        self.assertEqual(start.call_args.args, (
            'fake-token', 'x' * 32, str(bot.ROOT / 'children.json'), '127.0.0.1', 8089))


class ArrivalHTTPTests(unittest.TestCase):
    # Reuse the adapter's temporary database and synthetic payload.
    setUp = ArrivalTests.setUp
    tearDown = ArrivalTests.tearDown

    def test_auth_queue_and_duplicate_over_http(self):
        with tempfile.TemporaryDirectory() as folder:
            children = Path(folder) / 'children.json'
            children.write_text(json.dumps(self.children))
            profile_db = Path(folder) / 'profiles.db'
            with sqlite3.connect(profile_db) as profile:
                profile.executescript('CREATE TABLE profiles(user INTEGER PRIMARY KEY,name TEXT);'
                                      'CREATE TABLE records(id INTEGER PRIMARY KEY,user INTEGER,temperature REAL,symptoms TEXT,created TEXT);')
            with patch.object(server, 'worker'):
                httpd = server.start('fake-token', 'x' * 32, children, port=0, profile_db=profile_db)
            try:
                conn = http.client.HTTPConnection('127.0.0.1', httpd.server_port, timeout=5)
                try:
                    for auth, status, label in (
                        ('Bearer wrong', 401, None),
                        ('Bearer ' + 'x' * 32, 202, 'queued'),
                        ('Bearer ' + 'x' * 32, 202, 'already_accepted'),
                    ):
                        conn.request('POST', '/arrival', json.dumps(self.data), {
                            'Content-Type': 'application/json', 'Authorization': auth})
                        response = conn.getresponse()
                        result = json.loads(response.read())
                        self.assertEqual(response.status, status)
                        if label:
                            self.assertEqual(result['status'], label)
                    with server.connect() as db:
                        self.assertEqual(db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0], 1)
                finally:
                    conn.close()
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == '__main__':
    unittest.main()
