"""Privacy notice and explicit consent before any personal data is stored."""
import sqlite3
import unittest
from unittest.mock import patch

import bot


class ConsentTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.sent = []
        self.app = bot.Bot(self.db, lambda user, text, markup=None: self.sent.append((user, text, markup)))

    def say(self, text, user=1):
        self.app.handle({'chat': {'id': user, 'type': 'private'}, 'text': text})

    def consent_row(self, user=1):
        return self.db.execute('SELECT accepted_at FROM consents WHERE user=?', (user,)).fetchone()

    def test_start_shows_notice_and_profile_waits_for_roziman(self):
        self.say('/start')
        notice = self.sent[-1][1]
        for part in ('Maxfiylik va rozilik', 'bola profili', 'emlash', 'KidNova', 'bot serveridagi bazada',
                     'shifokor emas', '🗑 Maʼlumotlarni o‘chirish', 'Roziman'):
            self.assertIn(part, notice)
        self.assertEqual(self.sent[-1][2], bot.CONSENT_MENU)
        self.say('👶 Bola profili')
        self.assertIn('Maxfiylik va rozilik', self.sent[-1][1])
        self.assertIsNone(self.db.execute('SELECT 1 FROM sessions WHERE user=1 AND step=?', ('name',)).fetchone())
        self.say('✅ Roziman')
        self.assertRegex(self.consent_row()[0], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$')
        self.say('👶 Bola profili')
        self.assertIn('Bola profilini yaratamiz', self.sent[-1][1])

    def test_existing_user_must_accept_once_and_every_data_path_is_gated(self):
        self.db.execute("INSERT INTO profiles(user,name,age) VALUES(1,'Old',36)")
        for action in ('📝 Holat kiritish', '💉 Emlashlar', '🩺 Shifokor topish', 'ℹ️ Yordam', '/link KN-ABC234', '📊 Tarix'):
            self.say(action)
            self.assertIn('Maxfiylik va rozilik', self.sent[-1][1], action)
        self.app.handle({'chat': {'id': 1, 'type': 'private'}, 'location': {'latitude': 41.3, 'longitude': 69.2}})
        self.assertIn('Maxfiylik va rozilik', self.sent[-1][1])
        self.say('✅ Roziman')
        self.say('📊 Tarix')
        self.assertNotIn('Maxfiylik', self.sent[-1][1])

    def test_decline_stores_nothing_and_guide_and_delete_still_work(self):
        self.say('❌ Rozi emasman')
        self.assertIsNone(self.consent_row())
        self.assertIn('saqlamaydi', self.sent[-1][1])
        self.say('📖 Bot qo‘llanmasi')
        self.assertIn('Shifokor topish', self.sent[-1][1])
        self.say('✅ Roziman')
        self.db.execute("INSERT INTO profiles(user,name,age) VALUES(1,'X',36)")
        self.say('🗑 Maʼlumotlarni o‘chirish')
        self.say('OCHIR')
        self.assertIsNone(self.consent_row())
        self.assertIsNone(self.db.execute('SELECT 1 FROM profiles WHERE user=1').fetchone())
        self.assertIn('rozilik belgisi', self.sent[-1][1])

    def test_delete_confirmation_works_without_consent(self):
        self.db.execute("INSERT INTO profiles(user,name,age) VALUES(2,'Old',36)")
        self.say('🗑 Maʼlumotlarni o‘chirish', 2)
        self.say('OCHIR', 2)
        self.assertIsNone(self.db.execute('SELECT 1 FROM profiles WHERE user=2').fetchone())

    def test_deep_link_after_consent_links_once_accepted(self):
        calls = []
        self.app.link = lambda user, code: calls.append((user, code))
        self.say('/start KN-ABC234')
        self.assertIn('Maxfiylik va rozilik', self.sent[-1][1])
        self.assertEqual(calls, [])
        self.say('✅ Roziman')
        self.assertEqual(calls, [(1, 'KN-ABC234')])
        self.say('/start KN-XYZ234')
        self.assertEqual(calls[-1], (1, 'KN-XYZ234'))
        self.say('/start')
        self.assertEqual(len(calls), 2)


if __name__ == '__main__':
    unittest.main()
