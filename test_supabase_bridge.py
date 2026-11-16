"""KidNova Supabase bridge tests. No network: Supabase and Telegram are faked."""
import io
import json
import sqlite3
import unittest
import urllib.error
from unittest.mock import patch

import bot
import supabase_bridge as sb

ROW = {'notification_id': 'n-1', 'chat_id': 111, 'display_name': 'Demo Child A',
       'local_time': '10.11.2026 08:20', 'temperature_c': 37.8, 'height_cm': 104,
       'weight_kg': 17.2, 'requires_staff_review': True}


class FakeClient:
    def __init__(self, replies=None, error=None):
        self.replies, self.error, self.calls = replies or {}, error, []

    def rpc(self, name, args):
        self.calls.append((name, args))
        if self.error:
            raise self.error
        reply = self.replies.get(name)
        return reply(args) if callable(reply) else reply


class ClientTests(unittest.TestCase):
    def capture(self, key):
        seen = {}
        def opener(request, timeout):
            seen['url'], seen['headers'] = request.full_url, dict(request.header_items())
            seen['body'] = json.loads(request.data)
            return io.BytesIO(b'{"ok": true}')
        client = sb.Supabase('https://demo.supabase.co/', key, opener)
        self.assertEqual(client.rpc('kidnova_telegram_unlink', {'p_chat_id': 1}), {'ok': True})
        return seen

    def test_new_secret_key_only_in_apikey_header(self):
        seen = self.capture('sb_secret_test')
        self.assertEqual(seen['url'], 'https://demo.supabase.co/rest/v1/rpc/kidnova_telegram_unlink')
        self.assertEqual(seen['headers']['Apikey'], 'sb_secret_test')
        self.assertNotIn('Authorization', seen['headers'])

    def test_legacy_service_role_key_also_bearer(self):
        self.assertEqual(self.capture('eyJ.legacy.jwt')['headers']['Authorization'], 'Bearer eyJ.legacy.jwt')

    def test_rejects_publishable_key_and_http(self):
        with self.assertRaises(ValueError):
            sb.Supabase('https://demo.supabase.co', 'sb_publishable_x')
        with self.assertRaises(ValueError):
            sb.Supabase('http://demo.supabase.co', 'sb_secret_x')

    def test_http_error_is_sanitized(self):
        def opener(request, timeout):
            raise urllib.error.HTTPError(request.full_url, 401, 'secret detail', {}, None)
        with self.assertRaisesRegex(sb.SupabaseError, '^Supabase HTTP 401$'):
            sb.Supabase('https://demo.supabase.co', 'sb_secret_x', opener).rpc('x', {})

    def test_not_configured_and_mode(self):
        self.assertIsNone(sb.from_settings({}))
        self.assertEqual(sb.delivery_mode({}), 'preview')
        with self.assertRaises(ValueError):
            sb.delivery_mode({'SUPABASE_DELIVERY': 'yes'})


class CodeTests(unittest.TestCase):
    def test_code_normalization(self):
        code = sb.new_code()
        self.assertRegex(code, r'^KN-[A-HJ-NP-Z2-9]{6}$')
        self.assertEqual(sb.code_hash(' kn-abc234 '), sb.code_hash('KN-ABC234'))
        self.assertEqual(sb.code_hash('ABC234'), sb.code_hash('KN-ABC234'))
        for bad in ('', 'KN-12', 'KN-ABC23O', 'hello world'):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                sb.code_hash(bad)


class DeliveryTests(unittest.TestCase):
    def test_message_is_uzbek_and_not_diagnosis(self):
        text = sb.format_message(ROW)
        for part in ('Demo Child A', '37.8 °C', '104 sm', '17.2 kg', 'Xodim tekshiruvi kerak', 'tibbiy tashxis emas'):
            self.assertIn(part, text)

    def test_preview_mode_never_sends(self):
        client = FakeClient({'kidnova_telegram_pending': [ROW]})
        sent, logs = [], []
        self.assertEqual(sb.deliver_pending(client, lambda *a: sent.append(a), 'preview', logs.append), 1)
        self.assertEqual(sent, [])
        self.assertEqual(client.calls[-1][1]['p_status'], 'preview')

    def test_send_mode_sends_and_marks(self):
        client = FakeClient({'kidnova_telegram_pending': [ROW]})
        sent = []
        sb.deliver_pending(client, lambda chat, text: sent.append(chat), 'send')
        self.assertEqual(sent, [111])
        self.assertEqual(client.calls[-1], ('kidnova_telegram_mark', {
            'p_notification_id': 'n-1', 'p_chat_id': 111, 'p_status': 'sent', 'p_error': None}))

    def test_failed_send_is_marked_for_retry(self):
        client = FakeClient({'kidnova_telegram_pending': [ROW]})
        def send(chat, text):
            raise RuntimeError('Telegram HTTP 403')
        sb.deliver_pending(client, send, 'send')
        self.assertEqual(client.calls[-1][1]['p_status'], 'failed')
        self.assertEqual(client.calls[-1][1]['p_error'], 'Telegram HTTP 403')

    def test_worker_survives_errors(self):
        client = FakeClient(error=sb.SupabaseError('Supabase tarmoq xatosi'))
        logs = []
        with patch.object(sb.time, 'sleep', side_effect=[None, KeyboardInterrupt]):
            with self.assertRaises(KeyboardInterrupt):
                sb.worker(client, None, 'preview', log=logs.append)
        self.assertEqual(len(logs), 2)


class BotCommandTests(unittest.TestCase):
    def make(self, client):
        self.sent = []
        return bot.Bot(sqlite3.connect(':memory:'), lambda user, text, markup=None: self.sent.append(text),
                       kidnova=client)

    def msg(self, text):
        return {'chat': {'id': 111, 'type': 'private'}, 'text': text}

    def test_link_success(self):
        client = FakeClient({'kidnova_redeem_telegram_code': {'ok': True, 'child_name': 'Demo Child A'}})
        self.make(client).handle(self.msg('/link kn-abc234'))
        self.assertIn('Demo Child A ushbu chatga ulandi', self.sent[-1])
        self.assertEqual(client.calls[0][1], {'p_code_hash': sb.code_hash('KN-ABC234'), 'p_chat_id': 111})

    def test_link_wrong_code_and_rate_limit(self):
        client = FakeClient({'kidnova_redeem_telegram_code': {'ok': False}})
        b = self.make(client)
        for _ in range(5):
            b.handle(self.msg('/link KN-ABC234'))
        self.assertIn('Kod noto‘g‘ri', self.sent[-1])
        b.handle(self.msg('/link KN-ABC234'))
        self.assertIn('Juda ko‘p urinish', self.sent[-1])
        self.assertEqual(len(client.calls), 5)

    def test_link_without_config(self):
        self.make(None).handle(self.msg('/link KN-ABC234'))
        self.assertIn('hali sozlanmagan', self.sent[-1])

    def test_history_includes_only_this_chat_kidnova_rows(self):
        rows = [dict(ROW, reviewed=True)]
        client = FakeClient({'kidnova_telegram_history': lambda args: rows if args['p_chat_id'] == 111 else []})
        self.make(client).handle(self.msg('📊 Tarix'))
        self.assertIn('KidNova tekshiruvlari — Demo Child A', self.sent[-1])
        self.assertIn('37.8 °C', self.sent[-1])
        self.assertIn('ko‘rib chiqilgan', self.sent[-1])

    def test_history_survives_supabase_outage(self):
        self.make(FakeClient(error=sb.SupabaseError('x'))).handle(self.msg('📊 Tarix'))
        self.assertIn('yuklab bo‘lmadi', self.sent[-1])

    def test_unlink(self):
        client = FakeClient({'kidnova_telegram_unlink': True})
        self.make(client).handle(self.msg('/unlink'))
        self.assertEqual(self.sent[-1], 'KidNova ulanishlari (barcha bolalar) uzildi.')

    def test_link_second_child_mentions_count(self):
        client = FakeClient({'kidnova_redeem_telegram_code': {'ok': True, 'child_name': 'Demo Child B',
                                                              'already': False, 'children': 2}})
        self.make(client).handle(self.msg('/link KN-ABC234'))
        self.assertIn('Demo Child B ushbu chatga ulandi', self.sent[-1])
        self.assertIn('ulangan bolalar soni: 2', self.sent[-1])

    def test_link_same_child_again(self):
        client = FakeClient({'kidnova_redeem_telegram_code': {'ok': True, 'child_name': 'Demo Child A',
                                                              'already': True, 'children': 1}})
        self.make(client).handle(self.msg('/link KN-ABC234'))
        self.assertIn('avval ulangan edi', self.sent[-1])

    def test_link_limit(self):
        client = FakeClient({'kidnova_redeem_telegram_code': {'ok': False, 'reason': 'limit'}})
        self.make(client).handle(self.msg('/link KN-ABC234'))
        self.assertIn('10 tadan ortiq', self.sent[-1])

    def test_history_groups_several_children(self):
        rows = [dict(ROW, reviewed=False), dict(ROW, local_time='09.11.2026 08:10', temperature_c=36.6,
                                                 requires_staff_review=False),
                dict(ROW, display_name='Demo Child B', temperature_c=36.5, requires_staff_review=False)]
        text = sb.history_text(rows)
        self.assertEqual(text.count('KidNova tekshiruvlari —'), 2)
        a, b = text.split('\n\n')
        self.assertIn('Demo Child A', a)
        self.assertEqual(a.count('°C'), 2)
        self.assertIn('Demo Child B', b)
        self.assertIn('36.5 °C', b)
        self.assertEqual(sb.history_text([]), '')


if __name__ == '__main__':
    unittest.main()
