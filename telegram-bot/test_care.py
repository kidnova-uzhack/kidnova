import sqlite3
import unittest
from datetime import datetime, date, timezone
from unittest.mock import patch
from urllib.parse import urlparse, parse_qs
import bot
import care

class CareTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.sent = []
        self.app = bot.Bot(self.db, lambda *args: self.sent.append(args))
        self.app.has_consent = lambda user: True
    def say(self, text, user=1):
        self.app.handle({'chat': {'id':user, 'type':'private'}, 'text':text})
    def plan(self, user=1):
        self.say('➕ Emlash sanasi', user)
        self.say('Sinov emlash', user)
        self.say('01.10.2026', user)
        self.say('22.10.2026', user)
        self.say('Urgut poliklinikasi', user)
    @patch('care.today', return_value=date(2026,10,18))
    def test_setup_dates_and_owner_controls(self, _):
        self.plan()
        self.assertEqual(self.db.execute('SELECT previous_date,due_date FROM vaccinations').fetchone(), ('2026-10-01','2026-10-22'))
        self.say('/emlandi 1',2)
        self.assertEqual(self.db.execute('SELECT status FROM vaccinations').fetchone()[0], 'planned')
        self.say('/emlash_ochir 1',2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM vaccinations').fetchone()[0],1)
        self.say('/emlandi 1')
        self.assertEqual(self.db.execute('SELECT status FROM vaccinations').fetchone()[0], 'done')
    @patch('care.today', return_value=date(2026,10,18))
    def test_invalid_date_cancel_and_delete_all(self, _):
        self.say('➕ Emlash sanasi'); self.say('Test'); self.say('/skip')
        self.say('31.02.2026'); self.say('17.10.2026')
        self.assertEqual(self.db.execute('SELECT step FROM sessions').fetchone()[0],'v_due')
        self.say('/cancel')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM vaccinations').fetchone()[0],0)
        self.plan();self.say('🗑 Maʼlumotlarni o‘chirish');self.say('OCHIR')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM vaccinations').fetchone()[0],0)
    def test_reminder_window_timezone_dedup_and_done(self):
        self.db.execute("INSERT INTO vaccinations(user,name,due_date,clinic) VALUES(1,'Test','2026-10-22','Clinic')")
        self.db.commit()
        deliver=[]
        send=lambda *args:deliver.append(args)
        for instant in ('2026-10-17T05:00:00+00:00','2026-10-18T03:59:00+00:00'):
            care.remind(self.db,send,datetime.fromisoformat(instant))
        self.assertEqual(len(deliver),0)
        for day in range(18,23):
            now=datetime(2026,10,day,4,tzinfo=timezone.utc)
            care.remind(self.db,send,now);care.remind(self.db,send,now)
        self.assertEqual(len(deliver),5)
        care.remind(self.db,send,datetime(2026,10,23,5,tzinfo=timezone.utc))
        self.assertEqual(len(deliver),5)
        self.db.execute("UPDATE vaccinations SET status='done',sent_on=NULL")
        care.remind(self.db,send,datetime(2026,10,22,5,tzinfo=timezone.utc))
        self.assertEqual(len(deliver),5)
    def test_retry_failure_does_not_block_other_parent(self):
        for user in (1,2):self.db.execute("INSERT INTO vaccinations(user,name,due_date,clinic) VALUES(?,'Test','2026-10-22','Clinic')",(user,))
        self.db.commit()
        sent=[]
        def send(user,text):
            if user==1:raise RuntimeError('network')
            sent.append(user)
        now=datetime(2026,10,18,4,tzinfo=timezone.utc)
        care.remind(self.db,send,now)
        self.assertEqual(sent,[2])
        self.assertIsNone(self.db.execute('SELECT sent_on FROM vaccinations WHERE user=1').fetchone()[0])
        self.assertGreater(self.db.execute('SELECT next_retry FROM vaccinations WHERE user=1').fetchone()[0],now.timestamp())
    def clinic(self, name, km, specialty='', kind='clinic'):
        return {'name': name, 'address': 'Test Street', 'phone': '+998000000000', 'specialty': specialty,
                'kind': kind, 'lat': 39.4 + km / 100, 'lon': 67.2, 'km': km}

    def location(self, user=1):
        self.app.handle({'chat': {'id': user, 'type': 'private'}, 'location': {'latitude': 39.4, 'longitude': 67.2}})

    @patch('nearby.places')
    def test_asks_doctor_then_location_then_lists_matches(self, places):
        places.return_value = [self.clinic('General One', 0.2), self.clinic('Детская поликлиника №3', 0.5),
                               self.clinic('Kids Care', 0.9, 'paediatrics'), self.clinic('Bolalar shifoxonasi', 1.2)]
        self.say('🩺 Shifokor topish')
        self.assertIn('Qaysi shifokor kerak', self.sent[-1][1])
        self.location()
        self.assertIn('Avval 🩺 Shifokor topish', self.sent[-1][1])
        self.say('👶 Pediatr')
        self.assertIn('Lokatsiyani yuborish', self.sent[-1][1])
        self.location()
        text, markup = self.sent[-1][1], self.sent[-1][2]
        self.assertIn('Детская поликлиника', text)
        self.assertIn('Kids Care', text)
        self.assertIn('Bolalar shifoxonasi', text)
        self.assertNotIn('General One', text)
        self.assertIn('Katalogda pediatr bor', text)
        self.assertIn('Nomida pediatr', text)
        self.assertEqual(markup['keyboard'][0], ['📍 1', '📍 2', '📍 3'])
        self.assertEqual(self.db.execute('SELECT step FROM sessions WHERE user=1').fetchone()[0], 'care_results')
        places.assert_called_once()

    @patch('nearby.places')
    def test_few_matches_are_padded_with_labelled_general_clinics(self, places):
        places.return_value = [self.clinic('General One', 0.2), self.clinic('Глазная клиника', 0.3), self.clinic('ЛОР центр', 0.4),
                               self.clinic('Hospital Two', 0.6, kind='hospital')]
        self.say('/doctor'); self.say('quloq og‘riyapti')
        self.assertIn('👂 LOR', self.sent[-1][1])
        self.location()
        text = self.sent[-1][1]
        self.assertIn('ЛОР центр', text)
        self.assertIn('General One', text)
        self.assertIn('bor-yo‘qligini telefon orqali aniqlang', text)
        self.assertNotIn('Глазная', text)

    def test_unknown_doctor_text_asks_again(self):
        self.say('🩺 Shifokor topish'); self.say('nimadir boshqa')
        self.assertIn('tushunmadim', self.sent[-1][1])
        self.assertEqual(self.db.execute('SELECT step FROM sessions WHERE user=1').fetchone()[0], 'care_doctor')

    @patch('nearby.places')
    def test_pick_sends_map_card_with_route_buttons(self, places):
        venues = []
        self.app.send_venue = lambda *args: venues.append(args)
        places.return_value = [self.clinic('Kids Care', 0.9, 'paediatrics'), self.clinic('Детская 2', 1.0), self.clinic('Детская 3', 1.1)]
        self.say('🩺 Shifokor topish'); self.say('👶 Pediatr'); self.location()
        self.say('📍 2')
        user, lat, lon, title, address, markup = venues[-1]
        self.assertEqual((user, title, address), (1, 'Детская 2', 'Test Street'))
        self.assertAlmostEqual(lat, 39.41)
        urls = [row[0]['url'] for row in markup['inline_keyboard']]
        self.assertTrue(urls[0].startswith('https://www.google.com/maps/dir/?'))
        self.assertIn('destination=39.410000%2C67.200000', urls[0])
        self.assertIn('yandex.uz/maps', urls[1]); self.assertIn('maps.apple.com', urls[2])
        self.say('📍 3', 2)
        self.assertEqual(len(venues), 1)

    @patch('nearby.places')
    def test_pick_without_venue_falls_back_to_links_and_results_expire(self, places):
        places.return_value = [self.clinic('Kids Care', 0.9, 'paediatrics')] * 3
        self.say('🩺 Shifokor topish'); self.say('👶 Pediatr'); self.location()
        self.say('📍 1')
        self.assertIn('Yo‘l ko‘rsatish uchun xaritani tanlang', self.sent[-1][1])
        self.app.care_results[1]['time'] -= 601
        self.say('📍 1')
        self.assertIn('muddati tugadi', self.sent[-1][1])
        self.say('💉 Emlashlar')
        self.assertNotIn(1, self.app.care_results)

    @patch('nearby.places', side_effect=__import__('nearby').SearchError('Vaqtinchalik xato'))
    def test_search_failure_can_retry(self, _):
        self.say('/doctor'); self.say('👁 Ko‘z shifokori')
        self.location()
        self.assertIn('Vaqtinchalik xato', self.sent[-1][1])
        row = self.db.execute('SELECT step, payload FROM sessions WHERE user=1').fetchone()
        self.assertEqual(row[0], 'care_location')
        self.assertIn('Ko', row[1])

    def test_doctor_text_matching(self):
        self.assertEqual(care.doctor_from_text('Tish og‘riyapti'), '🦷 Stomatolog')
        self.assertEqual(care.doctor_from_text("ko'z"), '👁 Ko‘z shifokori')
        self.assertIsNone(care.match_reason({'name': 'Colorado clinic', 'specialty': ''}, '👂 LOR'))
        self.assertEqual(care.match_reason({'name': 'X', 'specialty': 'cardiology; paediatrics'}, '👶 Pediatr'), 'tag')

if __name__=='__main__':unittest.main()
