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
        responses=[{'username':'glow_well_bot'}, {'url':''}, RuntimeError('Telegram tarmoq xatosi'), [], KeyboardInterrupt()]
        with tempfile.TemporaryDirectory() as folder, patch.object(bot,'ROOT',Path(folder)), \
             patch.object(bot,'load_token',return_value='fake-token'), \
             patch.object(bot,'start_arrivals'), patch.object(bot,'api',side_effect=responses) as api, \
             patch.object(bot.time,'sleep') as sleep:
            with self.assertRaises(KeyboardInterrupt):bot.main()
            sleep.assert_called_once_with(3)
            self.assertEqual(sum(call.args[1]=='getUpdates' for call in api.call_args_list),3)

if __name__=='__main__':unittest.main()
