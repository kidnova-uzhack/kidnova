import io
import socket
import http.client
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import bot

class ConnectionTests(unittest.TestCase):
    def test_socket_timeout_and_disconnect_are_retryable(self):
        for error in (socket.timeout('read timed out'), ConnectionResetError('reset'),
                      http.client.RemoteDisconnected('closed'), http.client.IncompleteRead(b'partial')):
            with self.subTest(error=type(error).__name__):
                with patch.object(bot.urllib.request, 'urlopen', side_effect=error):
                    with self.assertRaisesRegex(RuntimeError, 'Telegram tarmoq xatosi'):
                        bot.api('fake-token', 'getUpdates', {})
    def test_invalid_response_is_retryable(self):
        with patch.object(bot.urllib.request, 'urlopen', return_value=io.BytesIO(b'broken json')):
            with self.assertRaises(RuntimeError):bot.api('fake-token','getUpdates',{})
    def test_polling_resumes_after_connection_failure(self):
        responses=[{'username':'kidnova_test_bot'}, {'url':''}, True, RuntimeError('Telegram tarmoq xatosi'), [], KeyboardInterrupt()]
        with tempfile.TemporaryDirectory() as folder, patch.object(bot,'ROOT',Path(folder)), \
             patch.object(bot,'load_token',return_value='fake-token'), \
             patch.object(bot,'start_arrivals'), patch.object(bot,'api',side_effect=responses) as api, \
             patch.object(bot.time,'sleep') as sleep:
            with self.assertRaises(KeyboardInterrupt):bot.main()
            sleep.assert_called_once_with(3)
            self.assertEqual(sum(call.args[1]=='getUpdates' for call in api.call_args_list),3)

    def test_failed_reply_does_not_replay_update(self):
        update={'update_id':7,'message':{'chat':{'id':111,'type':'private'},'text':'/start'}}
        responses=[{'username':'kidnova_test_bot'},{'url':''},True,[update],[],KeyboardInterrupt()]
        def fake_api(token,method,payload):
            if method=='sendMessage':raise RuntimeError('Telegram HTTP 403')
            item=responses.pop(0)
            if isinstance(item,BaseException):raise item
            return item
        handled=[]
        original=bot.Bot.handle
        def spy(self,msg):
            handled.append(msg['text']);return original(self,msg)
        with tempfile.TemporaryDirectory() as folder, patch.object(bot,'ROOT',Path(folder)), \
             patch.object(bot,'load_token',return_value='fake-token'), \
             patch.object(bot,'start_arrivals'), patch.object(bot,'api',side_effect=fake_api) as api, \
             patch.object(bot.Bot,'handle',spy), patch.object(bot.time,'sleep'), patch('builtins.print'):
            with self.assertRaises(KeyboardInterrupt):bot.main()
            offsets=[call.args[2]['offset'] for call in api.call_args_list if call.args[1]=='getUpdates']
        self.assertEqual(handled,['/start'])
        self.assertEqual(offsets[1:],[8,8])

    def test_bot_username_check_and_command_menu(self):
        for expected, ok in (('', True), ('@KidNova_Test_Bot', True), ('other_bot', False)):
            with self.subTest(expected=expected):
                responses=[{'username':'kidnova_test_bot'},{'url':''},True,KeyboardInterrupt()]
                with tempfile.TemporaryDirectory() as folder, patch.object(bot,'ROOT',Path(folder)), \
                     patch.dict(bot.os.environ,{'BOT_USERNAME':expected}), \
                     patch.object(bot,'load_token',return_value='fake-token'), patch.object(bot,'start_arrivals'), \
                     patch.object(bot,'api',side_effect=responses) as api, patch('builtins.print'):
                    with self.assertRaises(KeyboardInterrupt if ok else SystemExit):bot.main()
                    methods=[call.args[1] for call in api.call_args_list]
                self.assertEqual('setMyCommands' in methods, ok)
                if ok:
                    commands=[c['command'] for c in api.call_args_list[2].args[2]['commands']]
                    self.assertIn('link',commands)

if __name__=='__main__':unittest.main()
