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
    @patch('nearby.places')
    def test_location_results_stay_inside_bot(self, places):
        places.return_value=[{'name':'Test Clinic','address':'Test Street','phone':'+998000000000','specialty':'paediatrics','kind':'clinic','lat':39.4,'lon':67.2,'km':0.2}]
        self.say('🩺 Shifokor topish')
        self.app.handle({'chat':{'id':1,'type':'private'},'location':{'latitude':39.4,'longitude':67.2}})
        self.assertIn('Test Clinic',self.sent[-1][1])
        self.assertIn('0.2 km',self.sent[-1][1])
        self.assertIn('Test Street',self.sent[-1][1])
        self.assertIn('39.4,67.2',str(places.call_args.args).replace(' ',''))
        self.assertEqual(self.db.execute('SELECT payload FROM sessions WHERE user=1').fetchone()[0],'{}')
        self.say('👶 Pediatr')
        self.assertIn('Test Clinic',self.sent[-1][1])
        places.assert_called_once()
        self.say('🧠 Nevrolog')
        self.assertIn('topilmadi',self.sent[-1][1])
        self.say('👶 Pediatr',2)
        self.assertIn('qayta yuboring',self.sent[-1][1])
        self.say('💉 Emlashlar')
        self.assertNotIn(1,self.app.care_results)
    @patch('nearby.places',side_effect=__import__('nearby').SearchError('Vaqtinchalik xato'))
    def test_search_failure_can_retry(self, _):
        self.say('/doctor')
        self.app.handle({'chat':{'id':1,'type':'private'},'location':{'latitude':39.4,'longitude':67.2}})
        self.assertIn('Vaqtinchalik xato',self.sent[-1][1])
        self.assertEqual(self.db.execute('SELECT step FROM sessions WHERE user=1').fetchone()[0],'care_location')

if __name__=='__main__':unittest.main()
