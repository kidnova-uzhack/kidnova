"""GlowWell arrival adapter. Python 3.11+, standard library only."""
import hashlib
import hmac
import json
import math
import os
from pathlib import Path
import sqlite3
import threading
import time
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from zoneinfo import ZoneInfo
import qr_identity
import rfid_identity

ROOT = Path(__file__).resolve().parent.parent
DB = os.getenv('DB_PATH', str(ROOT / 'arrival.sqlite3'))


def connect():
    return sqlite3.connect(DB, timeout=10)


def init_db():
    with connect() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS outbox (
          event_id TEXT PRIMARY KEY, digest TEXT NOT NULL, chat_id INTEGER NOT NULL,
          message TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0, next_try REAL NOT NULL DEFAULT 0,
          delivery_mode TEXT NOT NULL DEFAULT 'send')''')
        columns = {row[1] for row in db.execute('PRAGMA table_info(outbox)')}
        if 'delivery_mode' not in columns:
            db.execute("ALTER TABLE outbox ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'send'")


def prepare(data, children):
    if not isinstance(data, dict):
        raise ValueError('JSON object required')
    required = {'event_id', 'child_id', 'measured_at', 'temperature_c', 'result'}
    if set(data) != required:
        raise ValueError('Required fields: ' + ', '.join(sorted(required)))
    for key in ('event_id', 'child_id'):
        if not isinstance(data[key], str) or not 1 <= len(data[key]) <= 100:
            raise ValueError('Invalid ' + key)
    if data['child_id'] not in children:
        raise ValueError('Unknown child_id')
    child = children[data['child_id']]
    if type(child.get('chat_id')) is not int or child['chat_id'] <= 0:
        raise ValueError('Parent private chat_id required')
    if not isinstance(child.get('name'), str) or not 1 <= len(child['name']) <= 100:
        raise ValueError('Invalid child name')
    value = data['temperature_c']
    if type(value) not in (float, int) or not math.isfinite(value) or not 20 <= value <= 50:
        raise ValueError('Invalid temperature: check sensor')
    result = data['result']
    if result not in ('in_range', 'attention', 'invalid'):
        raise ValueError('Invalid result')
    try:
        measured = datetime.fromisoformat(data['measured_at'].replace('Z', '+00:00'))
        if measured.tzinfo is None:
            raise ValueError()
        if measured.timestamp() > time.time() + 300:
            raise ValueError()
    except (ValueError, TypeError, AttributeError, OverflowError):
        raise ValueError('measured_at must be an ISO timestamp with timezone, not in future')
    local = measured.astimezone(ZoneInfo(os.getenv('DISPLAY_TIMEZONE', 'Asia/Tashkent')))
    labels = {
        'in_range': '✅ O‘lchangan ko‘rsatkich belgilangan oraliqda.',
        'attention': '🟠 O‘lchov bo‘yicha xodim e’tibori kerak. Bog‘cha xodimi bilan bog‘laning.',
        'invalid': '⚪ Ishonchli natija olinmadi. Xodim o‘lchovni qayta tekshirishi kerak.'
    }
    message = (
        f'🌿 GlowWell — bog‘chaga kelish\n\n'
        f'Farzandingiz {child["name"]} bog‘chaga keldi.\n'
        f'📅 O‘lchov vaqti: {local:%d.%m.%Y %H:%M} ({local.tzname()})\n'
        f'🌡 Harorat: {value:.1f} °C\n'
        f'{labels[result]}\n\n'
        'Bu avtomatik o‘lchov xabari, tibbiy tashxis emas.'
    )
    digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    return child['chat_id'], message, digest


def prepare_rfid_preview(data, child):
    """Create a medical-first preview. It is never eligible for delivery."""
    normalized = {key: value for key, value in data.items() if key != 'rfid_tag'}
    normalized['child_id'] = 'rfid-simulated'
    # Reuse the existing validation rules, then use RFID-specific preview wording.
    chat, _, digest = prepare(normalized, {'rfid-simulated': child})
    measured = datetime.fromisoformat(data['measured_at'].replace('Z', '+00:00'))
    local = measured.astimezone(ZoneInfo(os.getenv('DISPLAY_TIMEZONE', 'Asia/Tashkent')))
    simulated = rfid_identity.tag_source(data['rfid_tag']) == 'rfid_simulation'
    title = ('🌿 GlowWell — harorat skriningi (SIMULYATSIYA)' if simulated else
             '🌿 GlowWell — harorat skriningi (HARDWARE PROTOTIPI, TASDIQLANMAGAN)')
    reading_label = ('kontaktsiz harorat o‘lchovi simulyatsiya qilindi' if simulated else
                     'prototip adapteridan harorat o‘lchovi olindi; hardware tasdiqlanmagan')
    attendance_label = ('sintetik RFID' if simulated else 'RFID prototip adapteri')
    labels = {
        'in_range': '✅ Natija belgilangan oraliqda.',
        'attention': '🟠 Natija xodim tekshiruvini talab qiladi.',
        'invalid': '⚪ Ishonchli natija olinmadi; qayta o‘lchash kerak.'
    }
    message = (
        f'{title}\n\n'
        f'Farzandingiz {child["name"]} uchun {reading_label}.\n'
        f'🌡 Harorat: {data["temperature_c"]:.1f} °C\n'
        f'{labels[data["result"]]}\n'
        f'📅 Tekshiruv vaqti: {local:%d.%m.%Y %H:%M} ({local.tzname()})\n\n'
        f'🏫 Davomat (ikkilamchi): {attendance_label} orqali kelish qayd etildi.\n\n'
        'Bu Telegram xabari oldindan ko‘rish uchun tayyorlandi va yuborilmadi. '
        'Natija tibbiy tashxis emas.'
    )
    return chat, message, digest


def enqueue(data, children, profile_db=None):
    if not isinstance(data, dict) or type(data.get('event_id')) is not str or not 1 <= len(data['event_id']) <= 100:
        raise ValueError('Invalid event_id')
    is_qr = 'qr_token' in data
    is_rfid = 'rfid_tag' in data
    if is_qr and is_rfid:
        raise ValueError('Use one identification method')
    if is_qr:
        required = {'event_id', 'qr_token', 'measured_at', 'temperature_c', 'result'}
        if set(data) != required:
            raise ValueError('Invalid QR check-in fields')
        qr_identity.token_hash(data['qr_token'])
        if not profile_db:
            raise ValueError('Profile database required for QR check-in')
    if is_rfid:
        required = {'event_id', 'rfid_tag', 'measured_at', 'temperature_c', 'result'}
        if set(data) != required:
            raise ValueError('Invalid RFID simulation fields')
        rfid_identity.tag_hash(data['rfid_tag'])
        if not profile_db:
            raise ValueError('Profile database required for RFID simulation')
    digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    with connect() as db:
        old = db.execute('SELECT digest FROM outbox WHERE event_id=?', (data['event_id'],)).fetchone()
        if old:
            if old[0] != digest:
                raise ValueError('event_id already used for different data')
            return False
        if is_qr or is_rfid:
            db.execute('ATTACH DATABASE ? AS profile', (str(profile_db),))
            if is_qr:
                child = qr_identity.resolve(db, data['qr_token'], 'profile')
                if not child:
                    raise ValueError('Unknown or revoked QR credential')
                user, name = child
                normalized = {key: value for key, value in data.items() if key != 'qr_token'}
                normalized['child_id'] = 'qr-verified'
                chat, message, _ = prepare(normalized, {'qr-verified': {'name': name, 'chat_id': user}})
            else:
                child = rfid_identity.resolve(db, data['rfid_tag'], 'profile')
                if not child:
                    raise ValueError('Unknown or revoked RFID credential')
                user, name = child
                chat, message, _ = prepare_rfid_preview(
                    data, {'name': name, 'chat_id': user})
        else:
            chat, message, _ = prepare(data, children)
        delivery_mode = 'preview' if is_rfid else 'send'
        db.execute('''INSERT INTO outbox(event_id,digest,chat_id,message,delivery_mode)
                      VALUES(?,?,?,?,?)''',
                   (data['event_id'], digest, chat, message, delivery_mode))
        if is_qr:
            measured = datetime.fromisoformat(data['measured_at'].replace('Z', '+00:00'))
            created = measured.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
            labels = {'in_range': 'QR tekshiruv: belgilangan oraliqda',
                      'attention': 'QR tekshiruv: xodim e’tibori kerak',
                      'invalid': 'QR tekshiruv: qayta o‘lchash kerak'}
            db.execute('''INSERT INTO profile.records(user,temperature,symptoms,created,source,event_id)
                          VALUES(?,?,?,?,?,?)''', (user, data['temperature_c'], labels[data['result']],
                                               created, 'qr_checkin', data['event_id']))
        if is_rfid:
            measured = datetime.fromisoformat(data['measured_at'].replace('Z', '+00:00'))
            created = measured.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
            source = rfid_identity.tag_source(data['rfid_tag'])
            prefix = ('RFID simulyatsiya, kontaktsiz skrining' if source == 'rfid_simulation'
                      else 'RFID hardware prototipi, kontaktsiz skrining')
            labels = {
                'in_range': prefix + ': belgilangan oraliqda',
                'attention': prefix + ': xodim tekshiruvi kerak',
                'invalid': prefix + ': qayta o‘lchash kerak'
            }
            record = db.execute('''INSERT INTO profile.records
                (user,temperature,symptoms,created,source,event_id)
                VALUES(?,?,?,?,?,?)''', (user, data['temperature_c'], labels[data['result']],
                                         created, source, data['event_id']))
            db.execute('''INSERT INTO profile.attendance_events
                (event_id,user,checked_in_at,method,screening_record_id)
                VALUES(?,?,?,?,?)''', (data['event_id'], user, created,
                                      source, record.lastrowid))
    return True


def send_telegram(token, chat, message):
    request = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=json.dumps({'chat_id': chat, 'text': message, 'protect_content': True}).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=20) as response:
        if not json.load(response).get('ok'):
            raise RuntimeError('Telegram rejected message')


def deliver_once(token):
    """Deliver one real outbox item; preview-only RFID rows are excluded."""
    with connect() as db:
        row = db.execute('SELECT event_id,chat_id,message,attempts FROM outbox '
                         "WHERE sent=0 AND delivery_mode='send' AND next_try<=? "
                         'ORDER BY rowid LIMIT 1', (time.time(),)).fetchone()
    if not row:
        return False
    event, chat, message, attempts = row
    try:
        send_telegram(token, chat, message)
    except Exception:
        # Never log token, child data, or Telegram request URL.
        with connect() as db:
            db.execute('UPDATE outbox SET attempts=attempts+1,next_try=? WHERE event_id=?',
                       (time.time() + min(3600, 5 * 2 ** min(attempts, 10)), event))
        print('Telegram delivery failed; queued retry.', flush=True)
    else:
        with connect() as db:
            db.execute('UPDATE outbox SET sent=1,message=? WHERE event_id=?', ('', event))
    return True


def worker(token):
    while True:
        try:
            deliver_once(token)
        except Exception as exc:
            # Keep the delivery thread alive (e.g. a locked database); never log message data.
            print(f'Outbox worker error: {type(exc).__name__}; retrying.', flush=True)
            time.sleep(5)
        time.sleep(1)


def handler(secret, children, profile_db=None):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, status, payload):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            self.connection.settimeout(10)
            if self.path != '/arrival':
                return self.reply(404, {'error': 'Not found'})
            if not hmac.compare_digest(self.headers.get('Authorization', '').encode(), ('Bearer ' + secret).encode()):
                return self.reply(401, {'error': 'Unauthorized'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4096:
                    raise ValueError('Body must be 1..4096 bytes')
                if self.headers.get_content_type() != 'application/json':
                    raise ValueError('application/json required')
                data = json.loads(self.rfile.read(length))
                fresh = enqueue(data, children, profile_db)
            except (ValueError, UnicodeError) as exc:
                return self.reply(400, {'error': str(exc)})
            except (OSError, sqlite3.Error):
                return self.reply(503, {'error': 'Temporary error; retry same event_id'})
            self.reply(202, {'status': 'queued' if fresh else 'already_accepted'})
    return Handler


def start(token, secret, children_file=None, host='127.0.0.1', port=8080, profile_db=None):
    if len(secret) < 32:
        raise SystemExit('DEVICE_API_KEY must contain at least 32 characters')
    with open(children_file or ROOT / 'children.json', encoding='utf-8') as file:
        children = json.load(file)
    if not isinstance(children, dict):
        raise ValueError('children.json must contain an object')
    # Bind first, so a port conflict cannot leave an extra delivery worker running.
    profile_db = Path(profile_db or ROOT / 'glowwell.db')
    if not profile_db.is_file():
        raise ValueError('Existing profile database not found')
    with sqlite3.connect(str(profile_db)) as profile:
        qr_identity.init_db(profile)
        rfid_identity.init_db(profile)
    server = HTTPServer((host, port), handler(secret, children, profile_db))
    init_db()
    threading.Thread(target=worker, args=(token,), daemon=True).start()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print('GlowWell arrival adapter started. Keep exactly one instance running.', flush=True)
    return server


def main():
    os.umask(0o077)
    server = start(os.environ['BOT_TOKEN'], os.environ['DEVICE_API_KEY'],
                   os.getenv('CHILDREN_FILE'), os.getenv('HOST', '127.0.0.1'), int(os.getenv('PORT', '8080')))
    try:
        while True:
            time.sleep(60)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
