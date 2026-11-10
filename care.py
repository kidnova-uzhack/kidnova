"""Nearby care links and clinician-scheduled vaccination reminders."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
import math
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


CATEGORIES = {
    '☎️ Telefonli klinikalar': (),
    '🏥 Barcha klinikalar': (),
    '👶 Pediatr': ('paediatrics', 'pediatrics'),
    '🧠 Nevrolog': ('neurology',),
    '👂 LOR': ('otolaryngology',),
    '👁 Ko‘z shifokori': ('ophthalmology',),
}
CARE_MENU = {'keyboard': [['☎️ Telefonli klinikalar', '🏥 Barcha klinikalar'], ['👶 Pediatr', '🧠 Nevrolog'], ['👂 LOR', '👁 Ko‘z shifokori'], ['🩺 Shifokor topish', '⬅️ Asosiy menyu']], 'resize_keyboard': True}


def search(bot, user, lat, lon):
    bot.send(user, '🔎 Yaqin atrofdagi tibbiyot muassasalarini qidiryapman…', BACK)
    items = nearby.places(lat, lon)
    now = time.monotonic()
    bot.care_results = {key: value for key, value in bot.care_results.items() if now - value['time'] < 600}
    if len(bot.care_results) >= 500:
        bot.care_results.pop(next(iter(bot.care_results)))
    bot.state(user, 'care_results')
    bot.care_results[user] = {'items': items, 'time': now}
    show_results(bot, user, '🏥 Barcha klinikalar')


def show_results(bot, user, category):
    cached = bot.care_results.get(user)
    if not cached or time.monotonic() - cached['time'] >= 600:
        bot.care_results.pop(user, None)
        bot.state(user, 'care_location')
        return bot.send(user, 'Qidiruv muddati tugadi. Lokatsiyani qayta yuboring.', LOCATION_MENU)
    specialties = CATEGORIES[category]
    items = [item for item in cached['items'] if not specialties or any(value in [part.strip().lower() for part in item['specialty'].split(';')] for value in specialties)]
    if category == '☎️ Telefonli klinikalar':
        items = [item for item in items if item.get('callable_phone', bool(item['phone']))]
    if not items:
        return bot.send(user, 'O‘zbekiston katalogida 15 km ichida bu toifa bo‘yicha maʼlumot topilmadi. Bu yaqin atrofda shifokor yo‘q degani emas. 🏥 Barcha klinikalar tugmasini tanlang yoki boshqa lokatsiya yuboring.', CARE_MENU)
    bot.send(user, f'{category} — eng yaqin {min(5, len(items))} ta variant. Masofa to‘g‘ri chiziq bo‘yicha.\nManba: © OpenStreetMap contributors (openstreetmap.org/copyright), 17.10.2026 nusxasi. Mutaxassis va qabul vaqtini telefon orqali aniqlashtiring.', CARE_MENU)
    for index, item in enumerate(items[:5], 1):
        text = (f'{index}. {item["name"]}\n📍 Taxminan {item["km"]:.1f} km\n'
                f'🏠 {item["address"] or "Manzil manbada ko‘rsatilmagan"}\n'
                f'☎️ {item["phone"] or "Telefon manbada ko‘rsatilmagan"}')
        if item.get('phone_label'):
            text += '\n' + item['phone_label']
        route = 'https://www.google.com/maps/dir/?' + urlencode({'api': 1, 'destination': f'{item["lat"]},{item["lon"]}'})
        buttons = [[{'text': '🗺 Yo‘lni ko‘rish (ixtiyoriy)', 'url': route}]]
        if item.get('phone_source'):
            buttons.append([{'text': 'Telefon manbasi', 'url': item['phone_source']}])
        bot.send(user, text, {'inline_keyboard': buttons})


def handle(bot, user, text, location=None):
    row = bot.db.execute('SELECT step,payload FROM sessions WHERE user=?', (user,)).fetchone()
    step = row[0] if row else ''
    if location is not None and step != 'care_location':
        return False
    if text in CATEGORIES:
        show_results(bot, user, text)
        return True
    if text in ('🩺 Shifokor topish', '/doctor'):
        bot.state(user, 'care_location')
        bot.send(user, '🩺 O‘zbekiston bo‘yicha shifokor qidirish\n\nLokatsiyani yuboring — yaqin klinikalar botning o‘zida chiqadi.\n\nO‘zbekiston klinikalari katalogidan qidiriladi. Lokatsiya tashqi qidiruv xizmatiga yuborilmaydi va bazaga saqlanmaydi. Natijalar 10 daqiqa suhbat xotirasida turadi.', LOCATION_MENU)
        return True
    if step == 'care_location' and (location is not None or (text and not text.startswith('/') and text not in ('💉 Emlashlar', '📋 Emlashlarim', '➕ Emlash sanasi'))):
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
                lat, lon, label = nearby.geocode(text + ', Uzbekistan')
                bot.send(user, 'Topilgan hudud: ' + label[:400] + '\nMasofa shu hudud markazidan hisoblanadi.', BACK)
            except nearby.SearchError as exc:
                bot.send(user, str(exc), LOCATION_MENU)
                return True
        try:
            search(bot, user, lat, lon)
        except nearby.SearchError as exc:
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
