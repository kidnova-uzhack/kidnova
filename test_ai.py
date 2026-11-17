import io
import json
import sqlite3
import unittest
import urllib.error
from unittest.mock import patch

import ai_assistant
import bot


class AIClientTests(unittest.TestCase):
    def test_request_and_output(self):
        result = {'status': 'completed', 'output': [
            {'type': 'reasoning'},
            {'type': 'message', 'content': [{'type': 'output_text', 'text': 'Salom!'}]},
        ]}
        with patch.object(ai_assistant.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(result).encode())) as request:
            self.assertEqual(ai_assistant.answer({'OPENAI_API_KEY': 'fake-key'}, [{'role': 'user', 'content': 'Salom'}]), 'Salom!')
        sent = request.call_args.args[0]
        body = json.loads(sent.data)
        self.assertFalse(body['store'])
        self.assertEqual(body['input'], [{'role': 'user', 'content': 'Salom'}])
        self.assertEqual(body['max_output_tokens'], 900)
        self.assertEqual(sent.full_url, 'https://api.openai.com/v1/responses')

    def test_missing_key_makes_no_request(self):
        with patch.object(ai_assistant.urllib.request, 'urlopen') as request:
            with self.assertRaises(ai_assistant.AIError):
                ai_assistant.answer({}, [])
            request.assert_not_called()

    def test_api_errors_do_not_expose_credentials(self):
        for error in (urllib.error.HTTPError('secret-url', 401, 'secret-key', {}, None),
                      urllib.error.HTTPError('secret-url', 429, 'secret-key', {}, None),
                      TimeoutError('secret-key')):
            with patch.object(ai_assistant.urllib.request, 'urlopen', side_effect=error):
                with self.assertRaises(ai_assistant.AIError) as caught:
                    ai_assistant.answer({'OPENAI_API_KEY': 'fake-key'}, [])
                self.assertNotIn('secret', str(caught.exception))

    def test_incomplete_response_is_not_presented_as_complete(self):
        with patch.object(ai_assistant.urllib.request, 'urlopen', return_value=io.BytesIO(b'{"status":"incomplete"}')):
            with self.assertRaises(ai_assistant.AIError):
                ai_assistant.answer({'OPENAI_API_KEY': 'fake-key'}, [])


class GeminiTests(unittest.TestCase):
    def reply(self, body):
        return patch.object(ai_assistant.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(body).encode()))

    def test_provider_choice(self):
        self.assertEqual(ai_assistant.provider({'GEMINI_API_KEY': 'g'}), 'gemini')
        self.assertEqual(ai_assistant.provider({'OPENAI_API_KEY': 'o'}), 'openai')
        self.assertEqual(ai_assistant.provider({'GEMINI_API_KEY': 'g', 'AI_PROVIDER': 'openai'}), 'openai')
        self.assertEqual(ai_assistant.provider_label({'GEMINI_API_KEY': 'g'}), 'Google Gemini')

    def test_request_and_output(self):
        body = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [
            {'text': 'thinking', 'thought': True}, {'text': 'Salom!'}]}}]}
        messages = [{'role': 'user', 'content': 'Salom'}, {'role': 'assistant', 'content': 'Va alaykum'},
                    {'role': 'user', 'content': 'Yordam'}]
        with self.reply(body) as request:
            self.assertEqual(ai_assistant.answer({'GEMINI_API_KEY': 'fake-key'}, messages), 'Salom!')
        sent = request.call_args.args[0]
        self.assertEqual(sent.full_url, 'https://generativelanguage.googleapis.com/v1beta/models/'
                                        'gemini-3.5-flash:generateContent')
        self.assertNotIn('fake-key', sent.full_url)
        self.assertEqual(sent.get_header('X-goog-api-key'), 'fake-key')
        data = json.loads(sent.data)
        self.assertEqual([c['role'] for c in data['contents']], ['user', 'model', 'user'])
        self.assertIn('not a clinician', data['systemInstruction']['parts'][0]['text'])

    def test_blocked_or_truncated_is_error(self):
        for body in ({'promptFeedback': {'blockReason': 'SAFETY'}},
                     {'candidates': [{'finishReason': 'MAX_TOKENS', 'content': {'parts': [{'text': 'yarim'}]}}]},
                     {'candidates': [{'finishReason': 'SAFETY'}]}):
            with self.reply(body):
                with self.assertRaises(ai_assistant.AIError):
                    ai_assistant.answer({'GEMINI_API_KEY': 'fake-key'}, [{'role': 'user', 'content': 'x'}])

    def test_errors_hide_key_and_bad_model_rejected(self):
        error = urllib.error.HTTPError('url?key=secret', 400, 'secret', {}, None)
        with patch.object(ai_assistant.urllib.request, 'urlopen', side_effect=error):
            with self.assertRaises(ai_assistant.AIError) as caught:
                ai_assistant.answer({'GEMINI_API_KEY': 'secret'}, [{'role': 'user', 'content': 'x'}])
        self.assertNotIn('secret', str(caught.exception))
        with patch.object(ai_assistant.urllib.request, 'urlopen') as request:
            with self.assertRaises(ai_assistant.AIError):
                ai_assistant.answer({'GEMINI_API_KEY': 'k', 'GEMINI_MODEL': '../x?y'}, [])
            request.assert_not_called()


class AIConversationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.sent = []
        self.asked = []
        def ask(messages):
            self.asked.append(messages)
            return 'AI test javobi'
        self.app = bot.Bot(self.db, lambda *args: self.sent.append(args), ask_ai=ask)
        self.db.execute("INSERT INTO profiles(user,name,age,notes) VALUES(1,'Private child',24,'Private note')")
        self.db.commit()

    def say(self, text, user=1):
        self.app.handle({'chat': {'id': user, 'type': 'private'}, 'text': text})

    def test_help_discloses_ai_and_preserves_existing_profile(self):
        self.say('/help')
        self.assertRegex(self.sent[-1][1], r'(OpenAI|Google Gemini) xizmatiga yuboriladi')
        self.assertIn('AI', self.sent[-1][1])
        self.say('Salom')
        self.assertEqual(self.sent[-1][1], 'AI test javobi')
        self.assertEqual(self.asked[-1], [{'role': 'user', 'content': 'Salom'}])
        self.assertNotIn('Private', json.dumps(self.asked))
        self.assertNotIn('Salom', self.db.execute('SELECT payload FROM sessions WHERE user=1').fetchone()[0])

    def test_history_is_private_and_cleared(self):
        self.say('/help'); self.say('Birinchi')
        self.app.ai_chats[1]['updated'] -= 5
        self.say('Ikkinchi')
        self.assertEqual(len(self.asked[-1]), 3)
        self.say('/help', 2); self.say('Alohida', 2)
        self.assertEqual(self.asked[-1], [{'role': 'user', 'content': 'Alohida'}])
        self.say('🆕 Yangi suhbat'); self.say('Yangi')
        self.assertEqual(len(self.asked[-1]), 1)
        self.say('⬅️ Asosiy menyu')
        self.assertNotIn(1, self.app.ai_chats)
        self.say('Tasodifiy matn')
        self.assertIn('Yordam', self.sent[-1][1])

    def test_limits_expiry_and_error_recovery(self):
        self.say('/help'); self.say('a' * 2001)
        self.assertFalse(self.asked)
        self.say('Savol'); self.say('Juda tez')
        self.assertEqual(len(self.asked), 1)
        self.app.ai_chats[1]['updated'] -= 1801
        self.say('Yangi savol')
        self.assertEqual(len(self.asked[-1]), 1)
        self.say('🆕 Yangi suhbat')
        self.app.ask_ai = lambda _: (_ for _ in ()).throw(ai_assistant.AIError('Vaqtinchalik xato'))
        self.say('Savol')
        self.assertIn('Vaqtinchalik xato', self.sent[-1][1])
        self.assertNotIn(1, self.app.ai_chats)

    def test_profile_flow_and_guide_leave_ai_mode(self):
        self.say('/help'); self.say('Salom'); self.say('👶 Bola profili')
        self.assertNotIn(1, self.app.ai_chats)
        self.assertIn('Private child', self.sent[-1][1])
        self.say('/help'); self.say('📖 Bot qo‘llanmasi')
        self.assertIn('Profil:', self.sent[-1][1])
        self.assertIsNone(self.db.execute('SELECT step FROM sessions WHERE user=1').fetchone())


if __name__ == '__main__':
    unittest.main()
