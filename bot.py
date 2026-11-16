"""KidNova parent bot (formerly GlowWell). Python 3.10+, standard library only."""
import json
import math
import os
from pathlib import Path
import sqlite3
import threading
import time
import urllib.request
import urllib.error
import http.client
from ai_assistant import answer as ai_answer, AIError
import care
import qr_identity
import rfid_identity
import supabase_bridge

ROOT = Path(__file__).resolve().parent
COMMANDS = [
    {'command': 'start', 'description': 'Bot bilan tanishish va boshlash'},
    {'command': 'menu', 'description': 'Asosiy menyuni ochish'},
    {'command': 'profile', 'description': 'Bola profilini ko‘rish va tahrirlash'},
    {'command': 'record', 'description': 'Harorat va alomatlarni kiritish'},
    {'command': 'history', 'description': 'Holat qaydlari tarixini ko‘rish'},
    {'command': 'doctor', 'description': 'Yaqin klinikalarni topish'},
    {'command': 'vaccines', 'description': 'Emlashlar va eslatmalar'},
    {'command': 'arrival', 'description': 'Harorat skriningi va kelish qaydi haqida'},
    {'command': 'link', 'description': 'KidNova bog‘cha kodini ulash: /link KN-XXXXXX'},
    {'command': 'unlink', 'description': 'KidNova ulanishini uzish'},
    {'command': 'help', 'description': 'AI yordamchi (faollashtirilgach)'},
    {'command': 'guide', 'description': 'Botdan foydalanish qo‘llanmasi'},
    {'command': 'cancel', 'description': 'Joriy amalni bekor qilish'},
]
COMMAND_ALIASES = {'/menu': '⬅️ Asosiy menyu', '/profile': '👶 Bola profili',
                   '/record': '📝 Holat kiritish', '/history': '📊 Tarix'}
MENU = {'keyboard': [['👶 Bola profili', '📝 Holat kiritish'], ['🩺 Shifokor topish', '💉 Emlashlar'], ['🏫 Bog‘chaga kelish', '📊 Tarix'], ['ℹ️ Yordam', '🗑 Maʼlumotlarni o‘chirish']], 'resize_keyboard': True}
WELCOME = ('Assalomu alaykum! 🌿 KidNova botiga xush kelibsiz!\n\n'
           'Bu bot farzandingiz haqidagi qaydlarni yuritish va emlash sanalarini eslab turishga yordam beradi.\n\n'
           '👶 Bola profili — farzandingizning ismi va yoshini kiriting. Yosh yillarda yoziladi: masalan, 3.\n\n'
           '📝 Holat kiritish — o‘lchangan harorat va kuzatgan alomatlaringizni yozib boring.\n\n'
           '📊 Tarix — avval kiritilgan so‘nggi 10 ta holat qaydini ko‘ring.\n\n'
           '🩺 Shifokor topish — lokatsiyangizni yuborib, 15 km ichidagi katalogda mavjud klinikalarni va bor telefon raqamlarini bot ichida ko‘ring.\n\n'
           '💉 Emlashlar — shifokor belgilagan sanani kiriting. Bot ishlayotganida 4 kun oldin boshlab, emlash kuni ham, Toshkent vaqti bilan 09:00 dan keyin kuniga bir marta eslatadi. Sanalar poliklinikadan avtomatik olinmaydi.\n\n'
           '🏫 Bog‘chaga kelish — bog‘cha qurilmani ulab, farzandingizni sizga bog‘lagach, kelish xabarlarini oling.\n\n'
           'ℹ️ Yordam — AI yordamchiga savol yozish bo‘limi. AI xizmati faollashtirilgan bo‘lishi kerak.\n\n'
           '🗑 Maʼlumotlarni o‘chirish — botdagi profil, holat qaydlari va emlash eslatmalarini o‘chiring.\n\n'
           'Boshlash uchun pastdagi 👶 Bola profili tugmasini bosing. Boshqa bo‘limlarni ham to‘g‘ridan-to‘g‘ri ochishingiz mumkin.\n\n'
           )
AI_MENU = {'keyboard': [['🩺 Shifokor topish', '💉 Emlashlar'], ['🆕 Yangi suhbat', '📖 Bot qo‘llanmasi'], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}
AI_INTRO = ('🤖 KidNova AI yordamchisi\n\nSavolingizni oddiy matn bilan yozing. Bola parvarishi, bog‘cha va boshqa savollaringizga javob beraman.\n\n'
            'Men AI yordamchiman, shifokor emasman. Javoblar xato bo‘lishi mumkin. Shoshilinch holatda bot javobini kutmay, mahalliy tez yordamga murojaat qiling.\n\n'
            'Savolingiz va shu suhbatdagi so‘nggi xabarlar javob tayyorlash uchun OpenAI xizmatiga yuboriladi. Profil va tarix avtomatik yuborilmaydi. Shaxsiy maʼlumotlarni yozmang.\n\n'
            '🆕 Yangi suhbat — suhbat xotirasini tozalash. /cancel — chiqish.')
PROFILE_MENU = {'keyboard': [['✏️ Ism', '📅 Yosh'], ['🚼 Jins', '⚖️ Vazn'], ['📏 Bo‘y', '📌 Muhim izoh'], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}
SKIP_MENU = {'keyboard': [['⏭ O‘tkazib yuborish'], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}
PROFILE_FIELDS = {
    '✏️ Ism': ('name', 'Ism yoki taxallusni yuboring (1–50 belgi).'),
    '📅 Yosh': ('age', 'Yoshini yillarda raqam bilan yuboring (0–18). Masalan: 2. Bir yoshga to‘lmagan bo‘lsa, 0 yozing.'),
    '🚼 Jins': ('sex', 'Jinsini tanlang: O‘g‘il yoki Qiz.'),
    '⚖️ Vazn': ('weight', 'Vaznini kilogrammda yuboring. Masalan: 12.5.'),
    '📏 Bo‘y': ('height', 'Bo‘yini santimetrda yuboring. Masalan: 85.'),
    '📌 Muhim izoh': ('notes', 'Allergiya yoki boshqa muhim izohni yozing (500 belgigacha).'),
}

def field_prompt(field):
    prompt = next(prompt for key, prompt in PROFILE_FIELDS.values() if key == field)
    markup = SKIP_MENU
    if field == 'sex':
        markup = {'keyboard': [['O‘g‘il', 'Qiz'], ['⏭ O‘tkazib yuborish'], ['⬅️ Asosiy menyu']], 'resize_keyboard': True}
    return prompt + '\nIxtiyoriy. /skip — bo‘sh qoldirish; /cancel — bekor qilish.', markup

def load_settings():
    values = {}
    path = ROOT / '.env'
    if path.exists():
        for line in path.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip().strip('\"\'')
    return {**values, **os.environ}

def load_token():
    token = load_settings().get('BOT_TOKEN', '')
    if not token or token == 'YANGI_TOKENNI_SHU_YERGA_QOYING':
        raise SystemExit('.env faylda BOT_TOKEN ni sozlang.')
    return token

def start_arrivals(token):
    from arrival import server
    settings = load_settings()
    if settings.get('ARRIVAL_ENABLED', '1') != '1':
        return None
    if settings.get('DISPLAY_TIMEZONE'):
        os.environ['DISPLAY_TIMEZONE'] = settings['DISPLAY_TIMEZONE']
    return server.start(token, settings.get('DEVICE_API_KEY', ''),
                        settings.get('CHILDREN_FILE', str(ROOT / 'children.json')),
                        settings.get('ARRIVAL_HOST', '127.0.0.1'),
                        int(settings.get('ARRIVAL_PORT', '8080')))

class Bot:
    def __init__(self, db, send, ask_ai=None, kidnova=None):
        self.db, self.send = db, send
        self.ask_ai = ask_ai or (lambda messages: ai_answer(load_settings(), messages))
        self.kidnova = kidnova  # supabase_bridge.Supabase or None
        self.link_attempts = {}
        self.ai_chats = {}
        self.care_results = {}
        db.executescript('''
            CREATE TABLE IF NOT EXISTS profiles(user INTEGER PRIMARY KEY, name TEXT, age INTEGER);
            CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY, user INTEGER, temperature REAL, symptoms TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS sessions(user INTEGER PRIMARY KEY, step TEXT, payload TEXT);
            CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value INTEGER);
        ''')
        columns = {row[1] for row in db.execute('PRAGMA table_info(profiles)')}
        for column, kind in (('sex', 'TEXT'), ('weight', 'REAL'), ('height', 'REAL'), ('notes', 'TEXT')):
            if column not in columns:
                db.execute(f'ALTER TABLE profiles ADD COLUMN {column} {kind}')
        db.commit()
        care.init_db(db)
        qr_identity.init_db(db)
        rfid_identity.init_db(db)

    def profile(self, user):
        row = self.db.execute('SELECT name,age,sex,weight,height,notes FROM profiles WHERE user=?', (user,)).fetchone()
        if not row:
            self.state(user, 'name')
            return self.send(user, '👶 Bola profilini yaratamiz.\nIsm yoki taxallusni yuboring (1–50 belgi). /cancel — bekor qilish.', {'keyboard': [['⬅️ Asosiy menyu']], 'resize_keyboard': True})
        name, age, sex, weight, height, notes = row
        years, months = divmod(age, 12)
        age_label = (f'{years} yosh {months} oy' if months else f'{years} yosh') if years else f'{months} oy'
        return self.send(user, f'👶 Bola profili\n\n✏️ Ism: {name}\n📅 Yosh: {age_label}\n🚼 Jins: {sex or "Kiritilmagan"}\n⚖️ Vazn: {format(weight, "g") + " kg" if weight is not None else "Kiritilmagan"}\n📏 Bo‘y: {format(height, "g") + " sm" if height is not None else "Kiritilmagan"}\n📌 Muhim izoh: {notes or "Kiritilmagan"}\n\nO‘zgartirish uchun quyidagi tugmalardan tanlang. Boshqa bola uchun avval asosiy menyudan maʼlumotlarni o‘chiring.', PROFILE_MENU)

    def state(self, user, step, payload=None):
        if step not in ('care_results',):
            self.care_results.pop(user, None)
        if step != 'ai':
            self.ai_chats.pop(user, None)
        self.db.execute('INSERT OR REPLACE INTO sessions VALUES(?,?,?)', (user, step, json.dumps(payload or {})))
        self.db.commit()

    def link(self, user, code):
        if not self.kidnova:
            return self.send(user, 'KidNova ulanishi hali sozlanmagan. Bog‘cha masʼuliga murojaat qiling.', MENU)
        now = time.monotonic()
        attempts = [t for t in self.link_attempts.get(user, []) if now - t < 600]
        if len(attempts) >= 5:
            return self.send(user, 'Juda ko‘p urinish. 10 daqiqadan so‘ng qayta urinib ko‘ring.', MENU)
        self.link_attempts[user] = attempts + [now]
        try:
            digest = supabase_bridge.code_hash(code)
        except ValueError:
            return self.send(user, 'Kodni bog‘cha bergan ko‘rinishda yuboring: /link KN-XXXXXX', MENU)
        try:
            result = self.kidnova.rpc('kidnova_redeem_telegram_code', {'p_code_hash': digest, 'p_chat_id': user})
        except supabase_bridge.SupabaseError:
            return self.send(user, 'KidNova bazasiga ulanib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.', MENU)
        if not result or not result.get('ok'):
            return self.send(user, 'Kod noto‘g‘ri, ishlatilgan yoki muddati o‘tgan. Bog‘chadan yangi kod so‘rang.', MENU)
        self.link_attempts.pop(user, None)
        return self.send(user, f'✅ {result["child_name"]} ushbu chatga ulandi.\n\n'
                               'Endi KidNova bog‘chada tekshirgan maʼlumotlar shu yerga keladi va 📊 Tarix bo‘limida ko‘rinadi. '
                               'Uzish: /unlink', MENU)

    def unlink(self, user):
        if not self.kidnova:
            return self.send(user, 'KidNova ulanishi hali sozlanmagan.', MENU)
        try:
            removed = self.kidnova.rpc('kidnova_telegram_unlink', {'p_chat_id': user})
        except supabase_bridge.SupabaseError:
            return self.send(user, 'KidNova bazasiga ulanib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.', MENU)
        return self.send(user, 'KidNova ulanishi uzildi.' if removed else 'Bu chat KidNova ga ulanmagan.', MENU)

    def kidnova_history(self, user):
        if not self.kidnova:
            return ''
        try:
            return supabase_bridge.history_text(
                self.kidnova.rpc('kidnova_telegram_history', {'p_chat_id': user, 'p_limit': 10}) or [])
        except supabase_bridge.SupabaseError:
            return '🤖 KidNova tekshiruvlarini hozir yuklab bo‘lmadi.'

    def clear(self, user):
        self.care_results.pop(user, None)
        self.ai_chats.pop(user, None)
        self.db.execute('DELETE FROM sessions WHERE user=?', (user,))
        self.db.commit()

    def handle(self, msg):
        if msg.get('chat', {}).get('type') != 'private':
            return
        user = msg['chat']['id']
        text = msg.get('text', '').strip()
        if text.startswith('/'):
            command, separator, arguments = text.partition(' ')
            text = command.split('@')[0] + (separator + arguments if separator else '')
            text = COMMAND_ALIASES.get(text, text)
        if 'location' in msg:
            if not care.handle(self, user, '', msg['location']):
                self.send(user, 'Avval 🩺 Shifokor topish bo‘limini oching.', MENU)
            return
        if not text:
            return self.send(user, 'Matn yuboring. /cancel — bekor qilish.')
        if text.split()[0] == '/link':
            self.clear(user)
            return self.link(user, text.partition(' ')[2])
        if text == '/unlink':
            self.clear(user)
            return self.unlink(user)
        if text.split()[0].split('@')[0] == '/start':
            self.clear(user)
            return self.send(user, WELCOME, MENU)
        if text in ('/cancel', '⬅️ Asosiy menyu'):
            self.clear(user)
            return self.send(user, 'Quyidagi menyudan tanlang. Bu demo: avval sunʼiy maʼlumot bilan sinang.', MENU)
        if text in ('🏫 Bog‘chaga kelish', '/arrival'):
            self.clear(user)
            return self.send(user, '🌡 Harorat skriningi va kelish qaydi\n\nHozirgi RFID oqimi dasturiy simulyatsiya: kontaktsiz harorat skriningi asosiy qayd, davomat esa ikkilamchi qayd sifatida saqlanadi. Ota-ona Telegram xabari faqat oldindan ko‘rish uchun tayyorlanadi va yuborilmaydi.\n\n'
                             f'Bog‘cha masʼuliga ulash uchun chat ID: {user}\n'
                             'Masʼul ota-onalikni tekshirgach faqat sintetik RFID tegini shu profilga bog‘laydi. Profil yaratish tegni avtomatik ulamaydi.\n\n'
                             'Bu simulyatsiya tibbiy tashxis emas va haqiqiy sensor o‘lchovi hisoblanmaydi.\n\n'
                             '🤖 KidNova: bog‘cha bergan kodni /link KN-XXXXXX ko‘rinishida yuboring. '
                             'Shundan so‘ng KidNova tekshiruvlari shu chatga va 📊 Tarix bo‘limiga keladi.', MENU)
        if text in ('ℹ️ Yordam', '/help', '/ai', '🆕 Yangi suhbat'):
            self.clear(user)
            self.state(user, 'ai')
            return self.send(user, AI_INTRO, AI_MENU)
        if text in ('📖 Bot qo‘llanmasi', '/guide'):
            self.clear(user)
            return self.send(user, '🩺 Shifokor topish: lokatsiya bo‘yicha klinika variantlarini bot ichida ko‘rish. 💉 Emlashlar: shifokor belgilagan sanalar va kundalik eslatmalar.\n\nProfil: bolaning ismi, yoshi (yillarda), ixtiyoriy jins, vazn, bo‘y va muhim izoh. Profil bo‘limida har bir maydonni tahrirlash mumkin. Holat: qo‘lda o‘lchangan harorat va kuzatilgan alomatlar. Tarix: oxirgi 10 ta o‘zingiz kiritgan yozuv (vaqt UTC) va KidNova ulangan bo‘lsa, bog‘chadagi tekshiruvlar. /cancel — jarayonni bekor qilish.\n\nBog‘chaga kelish: bog‘cha bergan kodni /link KN-XXXXXX ko‘rinishida yuboring. Shundan so‘ng KidNova tekshiruvlari shu chatga keladi. Uzish: /unlink.\n\nMaʼlumot SQLite bazalarda saqlanadi. O‘chirish profil, barcha holat qaydlari, emlash eslatmalari, QR/RFID bog‘lanishlari va KidNova ulanishini o‘chiradi; Telegram chatidagi xabarlar qoladi. Bog‘chadagi KidNova tekshiruv yozuvlari bog‘cha bazasida qoladi.', MENU)
        if text == '👶 Bola profili':
            self.clear(user)
            return self.profile(user)
        if text in PROFILE_FIELDS:
            if not self.db.execute('SELECT 1 FROM profiles WHERE user=?', (user,)).fetchone():
                return self.profile(user)
            field, prompt = PROFILE_FIELDS[text]
            self.state(user, 'profile_edit', {'field': field})
            if field in ('name', 'age'):
                return self.send(user, prompt + '\n/cancel — bekor qilish.', {'keyboard': [['⬅️ Asosiy menyu']], 'resize_keyboard': True})
            prompt, markup = field_prompt(field)
            return self.send(user, prompt, markup)
        if text == '📝 Holat kiritish':
            if not self.db.execute('SELECT 1 FROM profiles WHERE user=?', (user,)).fetchone():
                return self.send(user, 'Avval bola profilini yarating.', MENU)
            self.state(user, 'temperature')
            return self.send(user, 'O‘lchangan haroratni °C da yuboring. Masalan: 36.7. Bot o‘lchovning to‘g‘riligini baholamaydi.')
        if text == '📊 Tarix':
            self.clear(user)
            rows = self.db.execute('SELECT temperature,symptoms,created FROM records WHERE user=? ORDER BY id DESC LIMIT 10', (user,)).fetchall()
            result = '\n\n'.join(f'{date} UTC\n{temp:g} °C — {symptoms[:280]}' for temp, symptoms, date in rows)
            kidnova = self.kidnova_history(user)
            if kidnova:
                result = (('📝 Sizning qaydlaringiz\n\n' + result + '\n\n') if result else '') + kidnova
            return self.send(user, (result or 'Hali qaydlar yo‘q.')[:4000], MENU)
        if text == '🗑 Maʼlumotlarni o‘chirish':
            self.state(user, 'delete')
            return self.send(user, 'Profil, barcha holat qaydlari, emlash eslatmalari, QR/RFID bog‘lanishlari va KidNova ulanishini o‘chirish uchun OCHIR deb yozing. Bog‘chadagi KidNova tekshiruv yozuvlari bog‘cha bazasida qoladi. /cancel — bekor qilish.')
        if care.handle(self, user, text):
            return
        row = self.db.execute('SELECT step,payload FROM sessions WHERE user=?', (user,)).fetchone()
        if not row:
            return self.send(user, 'Savol berish uchun ℹ️ Yordam tugmasini bosing yoki menyudan tanlang.', MENU)
        step, data = row[0], json.loads(row[1])
        if step == 'ai':
            if text.startswith('/'):
                return self.send(user, 'Savolingizni matn bilan yozing. /cancel — chiqish.', AI_MENU)
            if len(text) > 2000:
                return self.send(user, 'Savolingizni 2000 belgigacha yozing.', AI_MENU)
            now = time.monotonic()
            self.ai_chats = {key: chat for key, chat in self.ai_chats.items() if now - chat['updated'] < 1800}
            chat = self.ai_chats.get(user, {'messages': [], 'updated': 0})
            if chat['messages'] and now - chat['updated'] < 4:
                return self.send(user, 'Keyingi savolni bir necha soniyadan keyin yuboring.', AI_MENU)
            messages = chat['messages'][-10:] + [{'role': 'user', 'content': text}]
            try:
                reply = self.ask_ai(messages)
            except AIError as exc:
                return self.send(user, str(exc) + '\nShoshilinch vaziyatda bot javobini kutmang; mahalliy tez yordamga murojaat qiling.', AI_MENU)
            if len(self.ai_chats) >= 1000 and user not in self.ai_chats:
                self.ai_chats.pop(next(iter(self.ai_chats)))
            self.ai_chats[user] = {'messages': (messages + [{'role': 'assistant', 'content': reply}])[-12:], 'updated': time.monotonic()}
            for start in range(0, len(reply), 1800):
                self.send(user, reply[start:start + 1800], AI_MENU)
            return
        if step == 'name':
            if not 1 <= len(text) <= 50:
                return self.send(user, 'Ism 1–50 belgi bo‘lsin.')
            self.state(user, 'age', {'name': text})
            return self.send(user, 'Yoshini yillarda raqam bilan yuboring (0–18). Masalan, 2 yosh uchun 2 yozing. Bir yoshga to‘lmagan bo‘lsa, 0 yozing.')
        if step == 'age':
            if not text.isdecimal() or not 0 <= int(text) <= 18:
                return self.send(user, 'Yoshni 0–18 oralig‘ida butun son bilan yuboring. Masalan: 2.')
            data['age'] = int(text) * 12
            self.state(user, 'profile_setup', dict(data, field='sex'))
            prompt, markup = field_prompt('sex')
            return self.send(user, prompt, markup)
        if step in ('profile_setup', 'profile_edit'):
            field = data['field']
            skip = text in ('/skip', '⏭ O‘tkazib yuborish')
            value = None
            if field == 'name':
                if not 1 <= len(text) <= 50 or skip:
                    return self.send(user, 'Ism 1–50 belgi bo‘lsin.')
                value = text
            elif field == 'age':
                if not text.isdecimal() or not 0 <= int(text) <= 18:
                    return self.send(user, 'Yoshni 0–18 oralig‘ida butun son bilan yuboring. Masalan: 2.')
                value = int(text) * 12
            elif not skip:
                if field == 'sex':
                    if text not in ('O‘g‘il', 'Qiz'):
                        return self.send(user, 'O‘g‘il yoki Qiz tugmasini bosing. /skip — bo‘sh qoldirish.')
                    value = text
                elif field in ('weight', 'height'):
                    limit = 300 if field == 'weight' else 250
                    try:
                        value = float(text.replace(',', '.'))
                        if not math.isfinite(value) or not 0 < value <= limit:
                            raise ValueError
                    except ValueError:
                        return self.send(user, f'0 dan katta, {limit} gacha son yuboring. /skip — bo‘sh qoldirish.')
                elif field == 'notes':
                    if len(text) > 500:
                        return self.send(user, '500 belgigacha yozing. /skip — bo‘sh qoldirish.')
                    value = text
            if step == 'profile_edit':
                if field not in {item[0] for item in PROFILE_FIELDS.values()}:
                    return self.send(user, 'Profilni qayta oching.', MENU)
                self.db.execute(f'UPDATE profiles SET {field}=? WHERE user=?', (value, user))
                self.clear(user)
                return self.profile(user)
            data[field] = value
            fields = ['sex', 'weight', 'height', 'notes']
            index = fields.index(field)
            if index + 1 < len(fields):
                next_field = fields[index + 1]
                self.state(user, 'profile_setup', dict(data, field=next_field))
                prompt, markup = field_prompt(next_field)
                return self.send(user, prompt, markup)
            self.db.execute('INSERT INTO profiles(user,name,age,sex,weight,height,notes) VALUES(?,?,?,?,?,?,?)',
                            (user, data['name'], data['age'], data['sex'], data['weight'], data['height'], data['notes']))
            self.clear(user)
            return self.profile(user)
        if step == 'temperature':
            try:
                value = float(text.replace(',', '.'))
                if not math.isfinite(value) or not 25 <= value <= 45:
                    raise ValueError
            except ValueError:
                return self.send(user, '25–45 oralig‘idagi sonni yuboring. Bu faqat kiritish chegarasi, tibbiy baho emas. O‘lchovni tekshiring.')
            self.state(user, 'symptoms', {'temperature': value})
            return self.send(user, 'Kuzatgan alomatlaringizni yozing (500 belgigacha). Bo‘lmasa: alomat yo‘q.')
        if step == 'symptoms':
            if len(text) > 500:
                return self.send(user, '500 belgigacha yozing.')
            self.db.execute('INSERT INTO records(user,temperature,symptoms) VALUES(?,?,?)', (user, data['temperature'], text))
            self.clear(user)
            return self.send(user, 'Kuzatuv saqlandi. Bot bu yozuvga tibbiy baho bermaydi.', MENU)
        if step == 'delete':
            if text != 'OCHIR':
                return self.send(user, 'Tasdiqlash uchun OCHIR yoki bekor qilish uchun /cancel yuboring.')
            for table in ('attendance_events', 'rfid_credentials', 'qr_credentials',
                          'records', 'vaccinations', 'sessions', 'profiles'):
                self.db.execute(f'DELETE FROM {table} WHERE user=?', (user,))
            self.db.commit()
            note = ''
            if self.kidnova:
                try:
                    self.kidnova.rpc('kidnova_telegram_unlink', {'p_chat_id': user})
                    note = ' KidNova ulanishi ham uzildi.'
                except supabase_bridge.SupabaseError:
                    note = ' KidNova ulanishini uzib bo‘lmadi; keyinroq /unlink yuboring.'
            return self.send(user, 'Bot bazasidagi maʼlumotlaringiz o‘chirildi.' + note, MENU)

def api(token, method, payload):
    req = urllib.request.Request('https://api.telegram.org/bot' + token + '/' + method,
                                 json.dumps(payload).encode(), {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'Telegram HTTP {exc.code}') from None
    except (OSError, http.client.HTTPException, ValueError):
        raise RuntimeError('Telegram tarmoq xatosi') from None
    if not result.get('ok'):
        raise RuntimeError('Telegram so‘rovni qabul qilmadi')
    return result['result']

def main():
    os.umask(0o077)
    token = load_token()
    # The arrival server writes to this file too; wait for its lock instead of failing.
    db = sqlite3.connect(ROOT / 'glowwell.db', timeout=10)
    def send(user, text, markup=None):
        payload = {'chat_id': user, 'text': text}
        if markup:
            payload['reply_markup'] = markup
        api(token, 'sendMessage', payload)
    try:
        settings = load_settings()
        kidnova = supabase_bridge.from_settings(settings)
        kidnova_mode = supabase_bridge.delivery_mode(settings)
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    bot = Bot(db, send, kidnova=kidnova)
    try:
        identity = api(token, 'getMe', {})
        username = identity.get('username', '')
        expected = settings.get('BOT_USERNAME', '').strip().lstrip('@').lower()
        if expected and username.lower() != expected:
            raise SystemExit(f'Token @{expected} ga emas, @{username} ga tegishli. .env dagi BOT_USERNAME ni tekshiring.')
        if api(token, 'getWebhookInfo', {}).get('url'):
            raise SystemExit('Webhook mavjud. Uni olib tashlang yoki webhook serverdan foydalaning.')
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from None
    try:
        # Show the "/" command menu in Telegram; a new bot has none until this is set.
        api(token, 'setMyCommands', {'commands': COMMANDS})
    except RuntimeError as exc:
        print('Buyruqlar menyusini o‘rnatib bo‘lmadi: ' + str(exc))
    try:
        arrival_server = start_arrivals(token)
    except (OSError, ValueError) as exc:
        raise SystemExit('Kelish modulini ishga tushirib bo‘lmadi. DEVICE_API_KEY, children.json va portni tekshiring.') from None
    if kidnova:
        threading.Thread(target=supabase_bridge.worker, args=(kidnova, send, kidnova_mode), daemon=True).start()
        print('KidNova Supabase ulanishi yoqildi. Rejim: ' +
              ('SEND — ulangan ota-onalarga haqiqiy Telegram xabari yuboriladi' if kidnova_mode == 'send'
               else 'PREVIEW — Telegramga hech narsa yuborilmaydi'))
    else:
        print('KidNova Supabase ulanishi o‘chiq (SUPABASE_URL / SUPABASE_SECRET_KEY yo‘q).')
    print(f'@{username} ishga tushdi. To‘xtatish: Ctrl+C')
    row = db.execute("SELECT value FROM meta WHERE key='offset'").fetchone()
    offset = row[0] if row else 0
    while True:
        try:
            care.remind(db, send)
            updates = api(token, 'getUpdates', {'offset': offset, 'timeout': 25, 'allowed_updates': ['message']})
        except RuntimeError as exc:
            print(str(exc))  # No token, URL or health data in logs.
            time.sleep(3)
            continue
        except sqlite3.Error:
            db.rollback()
            print('Baza vaqtincha band; qayta urinilmoqda.')
            time.sleep(3)
            continue
        for update in updates:
            if 'message' in update:
                try:
                    bot.handle(update['message'])
                except Exception as exc:
                    # One bad update (blocked chat, locked DB, bug) must not stall polling
                    # or be replayed forever. Log only the error type: no chat or health data.
                    db.rollback()
                    print(f'Xabarni qayta ishlashda xato: {type(exc).__name__}')
            offset = update['update_id'] + 1
            try:
                db.execute("INSERT OR REPLACE INTO meta VALUES('offset',?)", (offset,))
                db.commit()
            except sqlite3.Error:
                db.rollback()  # offset stays in memory; saved on the next successful commit

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nBot to‘xtatildi.')
