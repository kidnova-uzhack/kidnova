# GlowWell Telegram bot — hackathon MVP

## Task 4: hardware adapter architecture

The software-only adapter boundary, Raspberry Pi/MFRC522/MLX90614 candidate review,
wiring plan, architecture diagram, price-free BOM, safety limits and remaining physical
tasks are documented in `HARDWARE_ARCHITECTURE.md`. Simulation is still the default.
Optional hardware imports occur only when `raspberry_pi` mode is explicitly selected;
missing libraries/devices fail closed and never fabricate readings. Real Telegram delivery
is still disabled for RFID flows. Software validation:
`python3 -m unittest test_hardware_adapters test_rfid_simulation -v`.

## KidNova dasturiy RFID va harorat skriningi simulyatsiyasi

Bu mavjud bot va mavjud `glowwell.db` arxitekturasiga qo‘shilgan, jismoniy qurilmasiz
ishlaydigan demo oqimidir. Asosiy hodisa — simulyatsiya qilingan kontaktsiz harorat
skriningi (`records.source=rfid_simulation`). Davomat shu tibbiy qaydga bog‘langan
ikkilamchi `attendance_events` yozuvidir. Mavjud profil va qaydlar almashtirilmaydi.

Faqat sunʼiy profil bilan ishlating. Profil botda yaratilgach, sintetik tegni bog‘lash:
`python3 scripts/rfid_sim_admin.py assign --user SUNIY_CHAT_ID --tag KN-RFID-SIM:CHILD_0001`.
Tegning o‘zi bazada saqlanmaydi; SHA-256 xeshi saqlanadi. Bekor qilish:
`python3 scripts/rfid_sim_admin.py revoke --user SUNIY_CHAT_ID`.

Serverga yuboriladigan simulyatsiya JSONi `event_id`, `rfid_tag`, vaqt zonali
`measured_at`, `temperature_c` va `result` (`in_range`, `attention`, `invalid`) dan
iborat. `arrival/simulate_rfid.py` `SYNTHETIC_RFID_TAG`, `DEVICE_API_KEY` va ixtiyoriy
`RFID_SIM_TEMPERATURE_C`, `RFID_SIM_RESULT`, `RFID_SIM_EVENT_ID` muhit qiymatlari bilan
shu so‘rovni yuboradi. Bir hodisani qayta urinishda aynan bir xil `event_id` va payload
ishlatiladi. Bir xil hodisa qayta yozilmaydi; o‘sha ID boshqa maʼlumot bilan kelsa rad
etiladi. Nomaʼlum yoki bekor qilingan teg hech qanday skrining yoki davomat yaratmaydi.

RFID simulyatsiyasi ota-ona uchun Telegram matnini `arrival.sqlite3` outboxida
`delivery_mode=preview` qilib tayyorlaydi. Yetkazish worker’i faqat `send` yozuvlarini
tanlaydi, shuning uchun simulyatsiya matni haqiqiy Telegramga yuborilmaydi. Previewda
teg qiymati bo‘lmaydi. Testlar ham vaqtinchalik bazalarda ishlaydi:
`python3 -m unittest test_rfid_simulation -v`. E2E testlar localhost HTTP so‘rovidan
boshlab RFID aniqlash, skrining tarixi, davomat bog‘lanishi, botdagi Tarix ko‘rinishi va
preview outboxigacha tekshiradi. Normal, ko‘tarilgan, nomaʼlum teg, dublikat, yo‘q/null
harorat va bazadagi xato/rollback holatlari qamrab olingan; Telegram funksiyasi mock
qilinadi va haqiqiy xabar yuborilmaydi.

Haqiqiy qurilmaga o‘tishdan oldin RFID reader drayveri, tasdiqlangan kontaktsiz sensor
va kalibrlash, klinik tasdiqlangan natija qoidalari, xavfsiz qurilma autentifikatsiyasi,
HTTPS, offline hodisa navbati, rozilik va teg berish/bekor qilish jarayoni hamda Telegram
yuborishni alohida operator qarori bilan yoqish talab qilinadi. QR yoki yuz orqali
identifikatsiya bu simulyatsiyaga qo‘shilmagan.

## QR orqali bolani aniqlash (KidNova / GlowWell)

Mavjud ota-ona profili bilan ishlaydi; yangi bot yoki yangi asosiy baza yaratilmaydi.
QR kartani faqat bog‘cha masʼuli ota-onalik va rozilikni tekshirgach beradi. Asosiy
`glowwell.db` bazasida QR matni emas, uning SHA-256 xeshi saqlanadi. QR kartaning
PNG fayli maxfiy maʼlumotdir; uni ochiq guruhga yoki GitHubʼga joylamang.

QR rasm tayyorlash uchun ixtiyoriy operator kutubxonasini o‘rnating:
`python3 -m pip install -r requirements-qr.txt`. So‘ng mavjud profilning Telegram
private chat IDsi bilan `python3 scripts/qr_admin.py issue --user CHAT_ID --output qr-cards/bola.png`
buyrug‘ini bajaring (`qr-cards` papkasini oldin yarating). Fayl 0600 huquq bilan
yaratiladi. Buyruq QR kalitini terminalga chiqarmaydi. Bir bola uchun qayta chiqarish
eski QRni bekor qiladi. Yo‘qolgan kartani `python3 scripts/qr_admin.py revoke --user CHAT_ID`
orqali bekor qiling. Har bir ota-ona akkaunti hozircha bitta bola profiliga ega.

Qurilma `POST /arrival` ga mavjud `Authorization: Bearer DEVICE_API_KEY` bilan quyidagi
JSONni yuboradi: `event_id`, `qr_token` (skanerdan o‘qilgan to‘liq `GWQR1:...` matni),
`measured_at` (vaqt zonali ISO sana), `temperature_c` (son), `result`
(`in_range`, `attention`, yoki `invalid`). Bu formatda `child_id` yuborilmaydi.
Qabul qilingan QR profildagi ota-onaga bog‘lanadi; o‘lchov `📊 Tarix`da
`qr_checkin` manbasi bilan saqlanadi va avvalgi kelish outboxiga xabar qo‘shiladi.
Takroriy `event_id` yangi qayd va xabar yaratmaydi. Eski `child_id`/`children.json`
oqimi ham ishlashda davom etadi. QR kartani nusxalash mumkin; skanerning API kaliti va
kartani himoyalang, yo‘qolsa darhol almashtiring. Sinovda haqiqiy Telegramga xabar
yuborilmaydi. Mahalliy test: `python3 -m unittest test_qr_checkin arrival.test_server test_integration -q`.

Kod o‘zgarishidan oldingi baza va fayllar `backups/qr-before-20261028-200050/`da.
QR funksiyasi hali ishlab turgan botga joylanmagan; uni yoqish uchun bot jarayonini
keyin qayta ishga tushirish kerak.

Python 3.10+ kerak. Tashqi Python kutubxonalari kerak emas.

## Mac’da ishga tushirish
1. ZIP faylni oching. Terminalda `glowwell` papkasiga kiring.
2. `cp .env.example .env`
3. `nano .env` — BotFather bergan **yangilangan** tokenni BOT_TOKEN yoniga qo‘ying. Saqlash: Ctrl+O, Enter; chiqish: Ctrl+X. Tokenni chatga yoki GitHub’ga yubormang.
4. `python3 bot.py`
5. Telegram’da https://t.me/glow_well_bot ni ochib /start yuboring.

Bot ishlashi uchun kompyuter yoqilgan, Terminal jarayoni faol va internet mavjud bo‘lishi kerak. Faqat bitta bot jarayonini ishlating. Bu paket hali serverga joylanmagan.

## Demo oqimi
/start → Bola profili → taxallus → yosh (yil, masalan: 2) → jins → vazn (kg) → bo‘y (sm) → muhim izoh → profil kartasi. Jins, vazn, bo‘y va izoh ixtiyoriy: /skip bilan bo‘sh qoldiriladi. Profil kartasidagi tugmalar orqali har bir maydon alohida tahrirlanadi. /cancel yoki Asosiy menyu tugmasi tugallanmagan kiritishni bekor qiladi.

Holat kiritish → harorat → alomatlar → Tarix.
Ikki Telegram akkauntida alohida sunʼiy maʼlumot kiriting; tarixlar bir-biriga ko‘rinmasligini tekshiring. /cancel oqimni bekor qiladi. O‘chirish OCHIR tasdig‘ini talab qiladi.

## Chegaralar
Bitta foydalanuvchiga bitta bola profili. Profil ismi, yoshi, jinsi, vazni, bo‘yi va muhim izohlarni saqlaydi. Eski SQLite bazaga yangi maydonlar avtomatik qo‘shiladi. Yosh 0–18 oralig‘ida butun yil bilan kiritiladi (masalan: 2); bir yoshga to‘lmaganlar uchun 0. Bazada moslik uchun oyga avtomatik aylantiriladi; eski profillar o‘zgarmaydi. Yosh avtomatik yangilanmaydi. Profilni tahrirlash eski qaydlarni saqlaydi; boshqa bola uchun avval o‘chiring. Vaqt UTC. Qurilmadan kelish xabarlarini qabul qilish moduli mavjud; haqiqiy qurilma va bola–ota-ona mosliklari hali sozlanmagan. Eslatmalar va tashxis mavjud emas. Jonli Telegram ulanishi haqiqiy token bilan mahalliy tekshirilishi kerak. Telegram hujjatlari: https://core.telegram.org/bots/api

Bu kuzatuv kundaligi; tibbiy tavsiya yoki tashxis emas. Hackathonda sunʼiy maʼlumot ishlating. Haqiqiy bolalar maʼlumotlari bilan foydalanishdan oldin ota-ona roziligi, server himoyasi, saqlash muddati va klinik tekshiruvlarni ishlab chiqing. Bot orqali kiritilgan maʼlumot Telegram va lokal SQLite bazadan o‘tadi. Bazadagi o‘chirish Telegram xabarlarini va tashqi zaxira nusxalarni o‘chirmaydi. Bazani va .env faylni ulashmang.

## Xatolar
- HTTP 401: token noto‘g‘ri yoki bekor qilingan.
- HTTP 409: boshqa bot jarayoni ishlayapti; uni to‘xtating.
- Tarmoq xatosi: internet/API ulanishini tekshiring.
- Webhook mavjud: avvalgi hosting sozlamasini tekshiring; bu bot polling orqali ishlaydi.

## Yangilanish: bog‘chaga kelish

ZIPdagi arrival moduli botga birlashtirildi. `python3 -u bot.py` ikkala xizmatni ishga tushiradi.
Telegramda /start → 🏫 Bog‘chaga kelish ota-onaning chat IDsini va ulanish tartibini ko‘rsatadi.
`children.json` ga masʼul tekshirgan bola IDsi → ism va chat_id mosligini kiriting va botni
qayta ishga tushiring. Hozir bu fayl bo‘sh. Namuna: arrival/children.example.json.

Server mahalliy http://127.0.0.1:8080/arrival manzilida JSON qabul qiladi.
`.env` dagi DEVICE_API_KEY bilan Authorization: Bearer headeri talab qilinadi.
Qurilma xabarlari arrival.sqlite3 navbatida saqlanadi; bir event_id takroran qabul
qilinsa qayta navbatga qo‘shilmaydi. Yuborishdagi uzilishlarda qayta urinadi.
Masofaviy robot uchun doimiy hosting va HTTPS manzili kerak. To‘liq format va
cheklovlar: arrival/README_UZ.md. Mavjud manba va baza backups/ ichida saqlangan.

Tekshiruv: `python3 -m unittest arrival.test_server test_integration -v`.

## AI yordamchisi

Telegramda ℹ️ Yordam yoki /help → savolni matn bilan yozing. /ai ham suhbatni ochadi.
🆕 Yangi suhbat suhbat xotirasini tozalaydi; /cancel yoki Asosiy menyu suhbatdan chiqaradi.
Oldingi qo‘llanma 📖 Bot qo‘llanmasi yoki /guide orqali ochiladi.

`.env` ichida OPENAI_API_KEY va ixtiyoriy OPENAI_MODEL sozlanadi (standart: gpt-4.1-mini).
Kalitni chatga yoki Gitga yubormang. Sozlamalar har bir AI so‘rovida qayta o‘qiladi;
kalit keyinroq kiritilsa botni qayta ishga tushirish shart emas. Kalit bo‘lmasa, bot
AI hali ulanmaganini ochiq bildiradi; soxta AI javobi bermaydi.

Integratsiya [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text)
orqali ishlaydi, store=false yuboriladi. Bu OpenAI tomonidan barcha turdagi saqlashni
bekor qilish kafolati emas. Faqat ota-ona yozgan savol va shu suhbatdagi oxirgi 10 xabar
yuboriladi; bola profili, kundalik, Telegram chat IDsi va kelish maʼlumotlari yuborilmaydi.
Javobdan keyin xotirada eng ko‘pi 12 xabar qoladi. AI suhbatlari lokal SQLite bazaga
saqlanmaydi; ular jarayon xotirasida turadi. 30 daqiqa faol bo‘lmagan suhbatlar keyingi
AI so‘rovida olib tashlanadi. Yangi suhbat, menyuga chiqish yoki botni qayta ishga
 tushirish xotirani tozalaydi. Telegramdagi xabarlar qoladi.

Savol 2000 belgigacha, ketma-ket muvaffaqiyatli so‘rovlar orasida 4 soniya cheklov mavjud.
AI so‘rovi uchun 25 soniyalik tarmoq kutishi belgilangan. Ushbu sodda polling versiyasida
AI javobi kutilayotganda boshqa chatlarning menyu javoblari kechikishi mumkin; kelish
xabarlari alohida oqimda ishlaydi. Ko‘p foydalanuvchili joriy etishda so‘rov navbati kerak.

Assistent umumiy maʼlumot beradi, tashxis qo‘ymaydi va bolaga dori dozasi belgilamaydi.
AI tibbiy xizmat yoki shoshilinch yordam o‘rnini bosmaydi. Klinik aniqlik tasdiqlanmagan.
Avtomatik testlar API formatini va suhbat oqimini sunʼiy javoblar bilan tekshiradi;
haqiqiy model javoblarini yoki klinik xavfsizlikni tasdiqlamaydi.

Tekshiruv: `python3 -m unittest test_ai test_integration.BotIntegrationTests arrival.test_server -v`.

## Shifokor qidirish va emlashlar

🩺 Shifokor topish (AI menyusida ham bor) lokatsiyani qabul qilib, 15 km ichidagi
OpenStreetMap tibbiyot muassasalarini masofa bo‘yicha saralaydi. Eng yaqin 5 natijaning
nomi, taxminiy to‘g‘ri chiziq masofasi, mavjud manzili va telefoni bot ichida chiqadi.
Pediatr, nevrolog, LOR va ko‘z shifokori tugmalari healthcare:speciality belgilari
bo‘yicha filtrlaydi; manbada belgi bo‘lmasa mutaxassis borligi taxmin qilinmaydi.
Yo‘lni ko‘rish ixtiyoriy Google Maps tugmasi. Qabul va bo‘sh vaqtni klinikadan tekshiring.
Ochiq baza to‘liq emas; qidiruvda topilmagan muassasa hududda yo‘q degani emas.
Maʼlumot manbasi: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright.

Qidiruv bot bilan birga saqlangan data/clinics-uz.json katalogida bajariladi; koordinata
tashqi POI xizmatiga yuborilmaydi. Katalog 2026-10-17 kungi Geofabrik Uzbekistan OSM
nusxasidan olingan: https://download.geofabrik.de/asia/uzbekistan.html.
U klinika, shifoxona va shifokor deb belgilangan nuqta va binolarni qamraydi; rasmiy
shifokorlar reyestri emas va hamma muassasalar/mutaxassislar mavjudligi kafolatlanmaydi.
Yangilash avtomatik emas: yangi PBF bilan `python3 scripts/build_clinics.py fayl.osm.pbf data/clinics-uz.json YYYY-MM-DD` ni ishlating
(qurish vositasi uchun osmium kerak, bot uchun tashqi Python kutubxonasi kerak emas).
Katalog ODbL asosidagi OpenStreetMap maʼlumoti: https://www.openstreetmap.org/copyright.

Natijalar foydalanuvchi bo‘yicha jarayon xotirasida 10 daqiqa amal qiladi va menyudan
chiqishda o‘chadi. Muddati tugagan obyektlar keyingi qidiruvlarda tozalanadi.
Telegramdagi lokatsiya xabari qoladi. Hudud nomidan koordinata olish ixtiyoriy:
NOMINATIM_URL muhit o‘zgaruvchisida operator tanlagan Nominatim-mos xizmat manzili
sozlanadi. Standart holatda lokatsiya tugmasi ishlatiladi. Ommaviy Nominatim yoqilmagan.
Uni tanlashdan oldin operator https://operations.osmfoundation.org/policies/nominatim/
qoidalarini ko‘rib chiqishi kerak: 1 so‘rov/soniya, identifikatsiyali User-Agent,
keshlash, manba ko‘rsatish va cheklangan yuk. Kiritilgan hudud nomi shunda tashqi
xizmatga uzatiladi. Kod yakka jarayonda 1.1 soniya oraliq va xotira keshini qo‘llaydi.

💉 Emlashlar → ➕ Emlash sanasi: nom, oldingi emlash sanasi (ixtiyoriy), shifokor
belgilagan keyingi sana, poliklinika nomi kiritiladi. Sanalar kun.oy.yil formatida.
Emlash oralig‘i yoki tibbiy jadval avtomatik hisoblanmaydi. Har foydalanuvchi uchun
20 tagacha faol yozuv; taqvimda so‘nggi 20 yozuv ko‘rsatiladi.

Eslatma Toshkent vaqti bilan soat 09:00 dan keyin, sanagacha 4, 3, 2, 1 kun qolganda
va emlash kuni yuboriladi. Bot keyinroq yoqilsa, shu kunlik eslatma yuboriladi; o‘tgan
kunlar uchun xabarlar yig‘ilib ketmaydi. Sanadan keyin yuborilmaydi. /emlandi ID
bajarilganini belgilaydi, /emlash_ochir ID yozuvni o‘chiradi. Sana o‘zgarsa eski yozuvni
o‘chirib yangisini kiriting. Umumiy maʼlumotlarni o‘chirish emlashlarni ham o‘chiradi.

Yuborilgan kun bazada saqlanadi, qayta ishga tushirish odatda dublikat bermaydi.
Telegram xabarni qabul qilib, javob yo‘qolsa yoki jarayon yozishdan oldin to‘xtasa,
qayta yuborishda takror xabar ehtimoli bor. Tarmoq xatosida 5 daqiqadan so‘ng qayta
uriniladi. Bitta bot jarayoni ishlashi kerak. Mac o‘chsa yoki uxlasa eslatmalar
ishlamaydi: doimiy ish uchun hosting kerak.

Poliklinika tizimidan avtomatik import/sinxronlash hali ulanmagan. Butun O‘zbekiston
bo‘yicha rasmiy integratsiya uchun tegishli tizimning API hujjatlari, ulanish huquqi
va ota-ona/bola identifikatorlarini ishonchli bog‘lash tartibi kerak.

Test: `python3 -m unittest test_care test_ai test_integration.BotIntegrationTests arrival.test_server -v`.

Telefonlar: `☎️ Telefonli klinikalar` faqat to‘liq formatli yoki qisqa xizmat raqami
bor natijalarni ko‘rsatadi. Hudud kodisiz 7 xonali raqamlar umumiy natijalarda
tegishli izoh bilan ko‘rsatiladi; hudud kodi taxmin qilinmaydi.
`data/clinic-contacts.json` rasmiy saytlardan olingan, aniq OSM obyektiga bog‘langan
telefon tuzatishlarini, manba havolasini va tekshirilgan sanani saqlaydi.
Tarmoq qabulxonasi alohida belgilanadi. Raqamlar telefon qilib tekshirilmagan.
2026-10-19 tekshiruvi: 2625 katalog yozuvidan 351 tasida to‘liq formatli raqam,
38 tasida faqat hudud kodisiz raqam, 2236 tasida ishlatish mumkin bo‘lgan raqam yo‘q.
Bu yozuvlar soni, noyob muassasalar soni emas (OSM bino/nuqta dublikatlari bor).
`data/clinics-missing-phones.csv` to‘liq raqam yetishmayotgan yozuvlar ro‘yxati.
To‘ldirish uchun SSV/hududiy boshqarmadan nom, manzil, qabulxona telefoni va
maʼlumot yangilangan sanasi bo‘lgan rasmiy CSV/Excel yoki API so‘rash mumkin.
