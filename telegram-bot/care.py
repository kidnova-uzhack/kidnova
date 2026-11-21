"""Nearby care links and clinician-scheduled vaccination reminders."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
import math
import re
import time
import nearby

UZ = ZoneInfo('Asia/Tashkent')
BACK = {'keyboard': [['⬅️ Asosiy menyu']], 'resize_keyboard': True}
V_MENU = {'keyboard': [['➕ Emlash sanasi', '📋 Emlashlarim'], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}
LOCATION_MENU = {'keyboard': [[{'text': '📍 Lokatsiyani yuborish', 'request_location': True}], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}


def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS vaccinations (
        id INTEGER PRIMARY KEY, user INTEGER NOT NULL, name TEXT NOT NULL,
        previous_date TEXT, due_date TEXT NOT NULL, clinic TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned', sent_on TEXT, next_retry REAL DEFAULT 0)''')
    db.commit()


def parse_date(text):
    value = datetime.strptime(text, '%d.%m.%Y').date()
    if not 1900 <= value.year <= 2100:
        raise ValueError('date out of range')
    return value


def today():
    return datetime.now(UZ).date()


# label: (OSM healthcare:speciality values, regex on the clinic's name, words a parent may type)
DOCTORS = {
    '👶 Pediatr': (('paediatrics', 'pediatrics'),
                  r'детск|педиатр|pediatr|\bbolalar|\bkids?\b|children',
                  ('pediatr', 'bolalar', 'bola shifokor', 'детск', 'педиатр')),
    '👂 LOR': (('otolaryngology',), r'\bлор\b|\blor\b|оторино|otorino',
              ('lor', 'quloq', 'tomoq', 'burun', 'лор', 'otorino')),
    '👁 Ko‘z shifokori': (('ophthalmology',), r'глаз|офтальм|oftalm|окулист|\bko[‘’\'`]?z\b|\beye',
                         ('ko‘z', "ko'z", 'koz', 'oftalm', 'окулист', 'глаз')),
    '🧠 Nevrolog': (('neurology',), r'невр|nevrolog|neuro', ('nevrolog', 'asab', 'невролог')),
    '🦷 Stomatolog': (('dentist', 'dentistry', 'stomatology'), r'стомат|stomatolog|dental|\bdent',
                     ('stomatolog', 'tish', 'стоматолог', 'dentist')),
    '🧴 Dermatolog': (('dermatology',), r'дерм|dermatolog|кожн|\bteri\b', ('dermatolog', 'teri', 'toshma', 'дерматолог')),
    '🤧 Allergolog': (('allergology',), r'аллерг|allergolog', ('allergolog', 'allergiya', 'аллерг')),
    '❤️ Kardiolog': (('cardiology',), r'кардио|kardio|cardio', ('kardiolog', 'yurak', 'кардиолог')),
    '🦴 Ortoped': (('orthopaedics', 'orthopedics', 'trauma'), r'ортопед|травм|ortoped|travm',
                  ('ortoped', 'travm', 'suyak', 'ортопед')),
    '🩺 Umumiy shifokor': ((), '', ('umumiy', 'terapevt', 'oilaviy', 'poliklinika')),
}
DOCTOR_MENU = {'keyboard': [['👶 Pediatr', '👂 LOR', '👁 Ko‘z shifokori'], ['🧠 Nevrolog', '🦷 Stomatolog', '🧴 Dermatolog'],
                            ['🤧 Allergolog', '❤️ Kardiolog', '🦴 Ortoped'], ['🩺 Umumiy shifokor', '⬅️ Asosiy menyu']],
               'resize_keyboard': True}
PICK = re.compile(r'^📍 ([1-5])$')
RESULT_LIMIT = 5


def doctor_from_text(text):
    if text in DOCTORS:
        return text
    words = text.casefold()
    for label, (_, _, typed) in DOCTORS.items():
        if any(word in words for word in typed):
            return label
    return None


def match_reason(item, label):
    """'tag' when the catalog lists the specialty, 'name' when the clinic's name says so, else None."""
    tags, pattern, _ = DOCTORS[label]
    listed = [part.strip().lower() for part in item.get('specialty', '').split(';')]
    if tags and any(value in listed for value in tags):
        return 'tag'
    if pattern and re.search(pattern, item.get('name', ''), re.IGNORECASE):
        return 'name'
    return None


def pick_clinics(items, label):
    """Specialty matches first; if fewer than 3, add the nearest general clinics, clearly labelled."""
    matched = [dict(item, reason=match_reason(item, label)) for item in items]
    exact = [item for item in matched if item['reason']][:RESULT_LIMIT]
    if len(exact) >= 3 or label == '🩺 Umumiy shifokor':
        return exact if exact else [dict(item, reason='general') for item in items[:RESULT_LIMIT]]
    # Padding must be a general clinic, not e.g. an eye clinic offered to someone looking for a dentist.
    others = [other for other in DOCTORS if other not in (label, '🩺 Umumiy shifokor')]
    general = [dict(item, reason='general') for item in matched
               if not item['reason'] and not any(match_reason(item, other) for other in others)]
    return sorted(exact + general[:RESULT_LIMIT - len(exact)], key=lambda row: row['km'])


def route_buttons(item):
    point = f'{item["lat"]:.6f},{item["lon"]:.6f}'
    return {'inline_keyboard': [
        [{'text': '🧭 Google Maps', 'url': 'https://www.google.com/maps/dir/?' + urlencode({'api': 1, 'destination': point})}],
        [{'text': '🧭 Yandex Maps', 'url': 'https://yandex.uz/maps/?' + urlencode({'rtext': '~' + point, 'rtt': 'auto'})}],
        [{'text': '🧭 Apple Maps (iPhone)', 'url': 'https://maps.apple.com/?' + urlencode({'daddr': point})}],
    ]}


def search(bot, user, lat, lon, label):
    bot.send(user, f'🔎 {label} — yaqin klinikalarni qidiryapman…', BACK)
    clinics = pick_clinics(nearby.places(lat, lon), label)
    if not clinics:
        bot.state(user, 'care_location', {'doctor': label})
        return bot.send(user, 'Katalogda 15 km ichida klinika topilmadi. Boshqa lokatsiya yuboring.', LOCATION_MENU)
    now = time.monotonic()
    bot.care_results = {key: value for key, value in bot.care_results.items() if now - value['time'] < 600}
    if len(bot.care_results) >= 500:
        bot.care_results.pop(next(iter(bot.care_results)))
    bot.state(user, 'care_results', {'doctor': label})
    bot.care_results[user] = {'items': clinics, 'time': now, 'doctor': label}
    note = {'tag': f'✅ Katalogda {label.split(" ", 1)[1].lower()} bor deb belgilangan',
            'name': f'✅ Nomida {label.split(" ", 1)[1].lower()} yo‘nalishi ko‘rsatilgan',
            'general': f'ℹ️ Umumiy klinika: {label.split(" ", 1)[1].lower()} bor-yo‘qligini telefon orqali aniqlang'}
    lines = [f'{label} — eng yaqin {len(clinics)} ta klinika\n']
    for index, item in enumerate(clinics, 1):
        lines.append(f'{index}. {item["name"]}\n'
                     f'   📍 ~{item["km"]:.1f} km · 🏠 {item["address"] or "manzil ko‘rsatilmagan"}\n'
                     f'   ☎️ {item["phone"] or "telefon ko‘rsatilmagan"}\n'
                     f'   {"🏥 " + (item.get("kind") or "klinika") if label == "🩺 Umumiy shifokor" else note[item["reason"]]}')
    lines.append('\nYo‘l ko‘rsatish uchun pastdan raqamni tanlang 👇\n'
                 'Masofa to‘g‘ri chiziq bo‘yicha. Manba: © OpenStreetMap contributors. '
                 'Qabul vaqti va shifokor borligini telefon orqali aniqlang.')
    keyboard = [[f'📍 {i}' for i in range(1, len(clinics) + 1)], ['🔁 Boshqa shifokor', '⬅️ Asosiy menyu']]
    bot.send(user, '\n'.join(lines)[:4000], {'keyboard': keyboard, 'resize_keyboard': True})


def send_route(bot, user, number):
    cached = bot.care_results.get(user)
    if not cached or time.monotonic() - cached['time'] >= 600:
        bot.care_results.pop(user, None)
        bot.state(user, 'care_doctor')
        return bot.send(user, 'Qidiruv muddati tugadi. Qaysi shifokor kerakligini qayta tanlang.', DOCTOR_MENU)
    if number > len(cached['items']):
        return bot.send(user, 'Ro‘yxatdagi raqamlardan birini tanlang.')
    item = cached['items'][number - 1]
    title = item['name'][:100]
    address = (item['address'] or f'~{item["km"]:.1f} km')[:100]
    if getattr(bot, 'send_venue', None):
        # Telegram's own map card: tapping it on the phone offers the installed map apps.
        try:
            bot.send_venue(user, item['lat'], item['lon'], title, address, route_buttons(item))
            return
        except RuntimeError:
            pass
    bot.send(user, f'📍 {title}\n🏠 {address}\nYo‘l ko‘rsatish uchun xaritani tanlang:', route_buttons(item))


def handle(bot, user, text, location=None):
    row = bot.db.execute('SELECT step,payload FROM sessions WHERE user=?', (user,)).fetchone()
    step = row[0] if row else ''
    payload = __import__('json').loads(row[1]) if row and row[1] else {}
    if location is not None and step != 'care_location':
        return False
    if text in ('🩺 Shifokor topish', '/doctor', '🔁 Boshqa shifokor'):
        bot.state(user, 'care_doctor')
        bot.send(user, '🩺 Qaysi shifokor kerak?\n\nPastdan tanlang yoki o‘zingiz yozing (masalan: "quloq og‘riyapti", "tish shifokori").', DOCTOR_MENU)
        return True
    if step == 'care_doctor' and text and not text.startswith('/'):
        label = doctor_from_text(text)
        if not label:
            bot.send(user, 'Qaysi shifokor ekanini tushunmadim. Iltimos, pastdagi ro‘yxatdan tanlang.', DOCTOR_MENU)
            return True
        bot.state(user, 'care_location', {'doctor': label})
        bot.send(user, f'{label} — yaxshi.\n\nEndi 📍 Lokatsiyani yuborish tugmasini bosing: atrofingizdagi klinikalarni topaman.\n\n'
                       'Lokatsiya faqat masofani hisoblash uchun ishlatiladi: tashqi xizmatga yuborilmaydi va bazaga saqlanmaydi.', LOCATION_MENU)
        return True
    if step == 'care_results' and PICK.match(text or ''):
        send_route(bot, user, int(PICK.match(text).group(1)))
        return True
    if step == 'care_location' and (location is not None or (text and not text.startswith('/') and text not in ('💉 Emlashlar', '📋 Emlashlarim', '➕ Emlash sanasi'))):
        label = payload.get('doctor', '🩺 Umumiy shifokor')
        if location is not None:
            lat, lon = location.get('latitude'), location.get('longitude')
            if any(type(v) not in (float, int) or not math.isfinite(v) for v in (lat, lon)) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
                bot.send(user, 'Lokatsiyani qayta yuboring.', LOCATION_MENU)
                return True
        else:
            if not 3 <= len(text) <= 200:
                bot.send(user, 'Hududni 3–200 belgi bilan yozing.', LOCATION_MENU)
                return True
            try:
                lat, lon, place = nearby.geocode(text + ', Uzbekistan')
                bot.send(user, 'Topilgan hudud: ' + place[:400] + '\nMasofa shu hudud markazidan hisoblanadi.', BACK)
            except nearby.SearchError as exc:
                bot.send(user, str(exc), LOCATION_MENU)
                return True
        try:
            search(bot, user, lat, lon, label)
        except nearby.SearchError as exc:
            bot.state(user, 'care_location', {'doctor': label})
            bot.send(user, str(exc), LOCATION_MENU)
        return True
    if text in ('💉 Emlashlar', '/vaccines', '📋 Emlashlarim'):
        bot.clear(user)
        rows = bot.db.execute('SELECT id,name,due_date,clinic,status,previous_date FROM vaccinations WHERE user=? ORDER BY due_date DESC LIMIT 20', (user,)).fetchall()
        bot.send(user, '💉 Emlash taqvimi\nShifokor belgilagan sanani kiriting. Bot sanadan 4 kun oldin boshlab, emlash kuni ham, har kuni 09:00 dan keyin (Toshkent vaqti) bir marta eslatadi. Bot ishlayotgan bo‘lishi kerak.\n\nPoliklinikadan avtomatik sinxronlash hali ulanmagan.', V_MENU)
        for ident, name, due, clinic, status, previous in rows:
            label = '✅ Bajarilgan' if status == 'done' else '⏳ Rejada'
            message = f'#{ident} — {name}\n📅 Sana: {datetime.fromisoformat(due):%d.%m.%Y}'
            if previous:
                message += f'\nOldingi emlash: {datetime.fromisoformat(previous):%d.%m.%Y}'
            message += f'\n🏥 {clinic}\n{label}\n/emlandi {ident} — bajarildi\n/emlash_ochir {ident} — yozuvni o‘chirish'
            bot.send(user, message, V_MENU)
        if not rows:
            bot.send(user, 'Hali emlash sanasi kiritilmagan. ➕ Emlash sanasi tugmasini bosing.', V_MENU)
        return True
    if text.startswith(('/emlandi ', '/emlash_ochir ')):
        command, _, ident = text.partition(' ')
        if not ident.isascii() or not ident.isdecimal() or len(ident) > 15:
            bot.send(user, 'Emlash raqamini yozing. Masalan: /emlandi 1', V_MENU)
            return True
        if command == '/emlandi':
            cursor = bot.db.execute("UPDATE vaccinations SET status='done' WHERE id=? AND user=?", (int(ident), user))
        else:
            cursor = bot.db.execute('DELETE FROM vaccinations WHERE id=? AND user=?', (int(ident), user))
        bot.db.commit()
        bot.clear(user)
        bot.send(user, ('Bajarildi. Bu yozuv uchun eslatmalar to‘xtadi. Keyingi emlash uchun shifokor belgilagan yangi sanani kiriting.' if cursor.rowcount else 'Sizga tegishli emlash yozuvi topilmadi.'), V_MENU)
        return True
    if text == '➕ Emlash sanasi':
        if bot.db.execute("SELECT COUNT(*) FROM vaccinations WHERE user=? AND status='planned'", (user,)).fetchone()[0] >= 20:
            bot.send(user, '20 ta faol yozuv mavjud. Avval bajarilganini belgilang yoki keraksizini o‘chiring.', V_MENU)
            return True
        bot.state(user, 'v_name')
        bot.send(user, 'Emlash nomini yoki shifokor bergan belgisini yozing (100 belgigacha). /cancel — bekor qilish.', BACK)
        return True
    if not step.startswith('v_'):
        return False
    import json
    data = json.loads(row[1])
    if step == 'v_name':
        if not 1 <= len(text) <= 100:
            bot.send(user, 'Nom 1–100 belgi bo‘lsin.', BACK)
            return True
        bot.state(user, 'v_previous', {'name': text})
        bot.send(user, 'Oldingi emlash sanasi: kun.oy.yil shaklida yozing. Masalan: 18.10.2026. Birinchi emlash bo‘lsa yoki sana nomaʼlum bo‘lsa /skip yozing.', BACK)
    elif step in ('v_previous', 'v_due'):
        try:
            value = None if step == 'v_previous' and text == '/skip' else parse_date(text)
            if value and ((step == 'v_previous' and value > today()) or (step == 'v_due' and value < today())):
                raise ValueError()
            if step == 'v_due' and data.get('previous') and value.isoformat() <= data['previous']:
                raise ValueError()
        except ValueError:
            bot.send(user, 'Sanani kun.oy.yil shaklida tekshirib yuboring. Oldingi emlash kelajakda, keyingi emlash o‘tmishda yoki oldingi sanadan avval bo‘lmasin.', BACK)
            return True
        if step == 'v_previous':
            data['previous'] = value.isoformat() if value else None
            bot.state(user, 'v_due', data)
            bot.send(user, 'Shifokor belgilagan keyingi emlash sanasini kiriting: kun.oy.yil. Bot emlash oralig‘ini o‘zi belgilamaydi.', BACK)
        else:
            data['due'] = value.isoformat()
            bot.state(user, 'v_clinic', data)
            bot.send(user, 'Poliklinika nomi va hududini yozing (200 belgigacha), yoki /skip.', BACK)
    elif step == 'v_clinic':
        if not 1 <= len(text) <= 200:
            bot.send(user, '200 belgigacha yozing yoki /skip.', BACK)
            return True
        clinic = 'Kiritilmagan' if text == '/skip' else text
        bot.db.execute('INSERT INTO vaccinations(user,name,previous_date,due_date,clinic) VALUES(?,?,?,?,?)', (user, data['name'], data.get('previous'), data['due'], clinic))
        bot.db.commit()
        bot.clear(user)
        bot.send(user, '✅ Emlash sanasi saqlandi. 4 kun oldin boshlab har kuni 09:00 dan keyin (Toshkent vaqti) va emlash kuni eslatma keladi. Sanani shifokor bilan tasdiqlang.', V_MENU)
    return True


def remind(db, send, now=None):
    now = now or datetime.now(timezone.utc)
    local = now.astimezone(UZ)
    if local.hour < 9:
        return
    day = local.date().isoformat()
    rows = db.execute("SELECT id,user,name,due_date,clinic FROM vaccinations WHERE status='planned' AND (sent_on IS NULL OR sent_on<>?) AND next_retry<=?", (day, now.timestamp())).fetchall()
    for ident, user, name, due, clinic in rows:
        days = (datetime.fromisoformat(due).date() - local.date()).days
        if not 0 <= days <= 4:
            continue
        label = 'Bugun' if days == 0 else f'{days} kundan keyin'
        try:
            send(user, f'💉 Emlash eslatmasi\n{name}\n{label}: {datetime.fromisoformat(due):%d.%m.%Y}\n🏥 {clinic}\n\nBu siz kiritgan sana. Qabulni poliklinika bilan tasdiqlang.\n/emlandi {ident} — bajarilganini belgilash\n/emlash_ochir {ident} — eslatmani o‘chirish')
        except RuntimeError:
            db.execute('UPDATE vaccinations SET next_retry=? WHERE id=?', (now.timestamp() + 300, ident))
        else:
            db.execute('UPDATE vaccinations SET sent_on=?,next_retry=0 WHERE id=?', (day, ident))
        db.commit()
