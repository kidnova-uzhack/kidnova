"""KidNova Supabase bridge for the Telegram bot. Python standard library only.

Uses RPCs from supabase/telegram_bridge.sql with a server-side secret key that lives
only in the bot's .env. Never put that key in browser code or logs.
"""
import hashlib
import json
import re
import secrets
import time
import urllib.error
import urllib.request

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # no 0/O or 1/I to avoid typos
CODE_PATTERN = re.compile(r'^KN-[A-HJ-NP-Z2-9]{6}$')  # same set as CODE_ALPHABET
DELIVERY_MODES = ('preview', 'send')


class SupabaseError(Exception):
    pass


class Supabase:
    def __init__(self, url, key, opener=None):
        url = (url or '').strip().rstrip('/')
        if not url.startswith('https://') or not key:
            raise ValueError('SUPABASE_URL (https://...) va SUPABASE_SECRET_KEY kerak')
        if key.startswith('sb_publishable_'):
            raise ValueError('Bot uchun publishable emas, secret (service_role) kalit kerak')
        self.url, self.key = url, key
        self.opener = opener or urllib.request.urlopen

    def headers(self):
        headers = {'Content-Type': 'application/json', 'apikey': self.key}
        if not self.key.startswith('sb_'):
            # Legacy JWT service_role key also goes in Authorization; new sb_secret_ keys must not.
            headers['Authorization'] = 'Bearer ' + self.key
        return headers

    def rpc(self, name, args):
        request = urllib.request.Request(f'{self.url}/rest/v1/rpc/{name}', json.dumps(args).encode(),
                                         self.headers(), method='POST')
        try:
            with self.opener(request, timeout=15) as response:
                body = response.read()
        except urllib.error.HTTPError as exc:
            raise SupabaseError(f'Supabase HTTP {exc.code}') from None
        except (OSError, ValueError):
            raise SupabaseError('Supabase tarmoq xatosi') from None
        try:
            return json.loads(body) if body else None
        except ValueError:
            raise SupabaseError('Supabase javobi noto‘g‘ri') from None


def from_settings(settings):
    """Return a client, or None when the bridge is not configured."""
    if not settings.get('SUPABASE_URL') or not settings.get('SUPABASE_SECRET_KEY'):
        return None
    return Supabase(settings['SUPABASE_URL'], settings['SUPABASE_SECRET_KEY'])


def delivery_mode(settings):
    mode = settings.get('SUPABASE_DELIVERY', 'preview').strip().lower()
    if mode not in DELIVERY_MODES:
        raise ValueError('SUPABASE_DELIVERY faqat preview yoki send bo‘lishi mumkin')
    return mode


def normalize_code(code):
    code = (code or '').strip().upper().replace(' ', '')
    if code and not code.startswith('KN-'):
        code = 'KN-' + code
    if not CODE_PATTERN.fullmatch(code):
        raise ValueError('Kod KN-XXXXXX ko‘rinishida bo‘lishi kerak')
    return code


def code_hash(code):
    return hashlib.sha256(normalize_code(code).encode('ascii')).hexdigest()


def new_code():
    return 'KN-' + ''.join(secrets.choice(CODE_ALPHABET) for _ in range(6))


def _number(value):
    return format(float(value), 'g')


def format_message(row):
    review = ('🟠 Xodim tekshiruvi kerak. Bog‘cha xodimi bilan bog‘laning.'
              if row['requires_staff_review'] else '✅ Xodim tekshiruvi talab qilinmadi.')
    return (
        '🌿 KidNova — bog‘chaga kelish (DEMO)\n\n'
        f'Farzandingiz {row["display_name"]} bog‘chaga keldi.\n'
        f'📅 Tekshiruv vaqti: {row["local_time"]} (Toshkent)\n'
        f'🌡 Harorat: {_number(row["temperature_c"])} °C\n'
        f'📏 Bo‘y: {row["height_cm"]} sm · ⚖️ Vazn: {_number(row["weight_kg"])} kg\n'
        f'{review}\n\n'
        'Bu simulyatsiya qilingan o‘lchov, tibbiy tashxis emas.'
    )


def history_text(rows):
    if not rows:
        return ''
    lines = []
    for row in rows:
        flag = '🟠 xodim tekshiruvi' + (' (ko‘rib chiqilgan)' if row.get('reviewed') else '') \
            if row['requires_staff_review'] else '✅'
        lines.append(f'{row["local_time"]} — {_number(row["temperature_c"])} °C, '
                     f'{row["height_cm"]} sm, {_number(row["weight_kg"])} kg {flag}')
    return f'🤖 KidNova tekshiruvlari — {rows[0]["display_name"]} (DEMO)\n' + '\n'.join(lines)


def deliver_pending(client, send, mode, log=print):
    """Handle new KidNova check-ins once. Returns how many rows were processed."""
    rows = client.rpc('kidnova_telegram_pending', {'p_limit': 20}) or []
    for row in rows:
        error = None
        if mode == 'send':
            try:
                send(row['chat_id'], format_message(row))
                status = 'sent'
            except Exception as exc:
                status = 'failed'
                # bot.api raises sanitized RuntimeErrors; anything else is logged by type only.
                error = str(exc)[:100] if isinstance(exc, RuntimeError) else type(exc).__name__
        else:
            status = 'preview'
            log(f'[PREVIEW] KidNova xabari tayyorlandi, Telegramga yuborilmadi: {row["display_name"]}')
        client.rpc('kidnova_telegram_mark', {'p_notification_id': row['notification_id'],
                                             'p_chat_id': row['chat_id'], 'p_status': status,
                                             'p_error': error})
    return len(rows)


def worker(client, send, mode, interval=10, log=print):
    while True:
        try:
            deliver_pending(client, send, mode, log)
        except Exception as exc:
            log(f'KidNova bridge xatosi: {type(exc).__name__}; qayta urinilmoqda.')
        time.sleep(interval)
