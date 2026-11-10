# GlowWell: bog‘chaga kelganda ota-onaga avtomatik xabar

## Hardware adapter arxitekturasi

`arrival/hardware.py` simulyatsiya va ixtiyoriy Raspberry Pi adapterlarini bir xil
payload chegarasiga keltiradi. Standart rejim `simulated`; `raspberry_pi` rejimi faqat
aniq tanlanganda ixtiyoriy MFRC522 va MLX90614 kutubxonalarini yuklaydi. Kutubxona,
qurilma yoki o‘lchov yo‘q bo‘lsa, soxta maʼlumotga o‘tmaydi va payload yaratmaydi.
Ulanish chizmasi, komponentlar, elektr/optik cheklovlar va qolgan jismoniy tekshiruvlar
asosiy papkadagi `HARDWARE_ARCHITECTURE.md`da. Telegram hali faqat preview.

## Dasturiy RFID simulyatsiyasi

`rfid_tag` bilan kelgan yangi oqim jismoniy reader yoki sensor ishlatmaydi. U mavjud
profilga xeshlangan sintetik teg orqali bog‘lanadi, avval harorat skriningini mavjud
`records` jadvaliga yozadi va keyin shu yozuvga bog‘langan ikkilamchi davomat hodisasini
yaratadi. Ota-ona xabari `preview` holatida saqlanadi va `worker` uni Telegramga
yubormaydi. Eski `child_id` va oldindan mavjud QR oqimlarining xulqi o‘zgarmagan.

RFID payloadi:

```json
{
  "event_id": "rfid-demo-0001",
  "rfid_tag": "KN-RFID-SIM:CHILD_0001",
  "measured_at": "2026-10-31T08:20:00+05:00",
  "temperature_c": 36.6,
  "result": "in_range"
}
```

Faqat sunʼiy profil va teg ishlating. Bog‘lash vositasi:
`python3 scripts/rfid_sim_admin.py assign --user SUNIY_CHAT_ID --tag KN-RFID-SIM:CHILD_0001`.
Simulyator: `python3 arrival/simulate_rfid.py`. To‘rtta asosiy holat — normal harorat,
ko‘tarilgan harorat, nomaʼlum teg va dublikat check-in — hamda yo‘q/null o‘lchov va
baza xatosidagi to‘liq rollback `python3 -m unittest test_rfid_simulation -v` bilan
localhost HTTP va vaqtinchalik bazalarda tekshiriladi. Test Telegram yuborishini bloklaydi.

QR identifikatsiya ham qo‘shildi: masʼul mavjud profil uchun
`scripts/qr_admin.py` orqali maxfiy QR karta chiqaradi. Qurilma `/arrival`ga
`child_id` o‘rniga `qr_token` yuboradi va DEVICE_API_KEY bilan tasdiqlanadi.
QR tekshiruvi `glowwell.db`dagi mavjud profilga bog‘lanib, o‘lchovni `records`
tarixiga yozadi hamda odatdagi xabar navbatiga qo‘shadi. Eski `children.json`
oqimi saqlangan. Operator tartibi asosiy README boshida yozilgan.

Python 3.11 yoki yangiroq. Qo‘shimcha paket talab qilinmaydi.
Bu mavjud botga qo‘shiladigan alohida adapter; getUpdates yoki webhookni egallamaydi.
Robot o‘lchov tugaganda POST /arrival yuborishi kerak. Kod hali haqiqiy robotga ulanmagan.

## 1. Ota-ona va bolani bog‘lash
Ota-ona avval botning shaxsiy chatida /start bosadi.
Mavjud botingizdagi message.chat.id qiymatini oling. Username yoki telefon raqami emas.
Bog‘cha xodimi ota-onalikni va rozilikni tekshirgach, bolaning QR/RFID identifikatorini
shu chat_id bilan bog‘laydi. Bola ID si ota-onani ro‘yxatdan o‘tkazish paroli emas.
children.example.json faylidan children.json nusxa yarating va haqiqiy mosliklarni kiriting.
children.json o‘zgarsa adapterni qayta ishga tushiring.

## 2. Hozirgi bot bilan ishga tushirish

Loyiha asosiy papkasida `python3 -u bot.py` ni ishga tushiring. Bot polling va kelish
HTTP serveri bitta jarayonda ishlaydi. Alohida server.py nusxasini ishga tushirmang.
Bot `.env` ichidagi BOT_TOKEN va DEVICE_API_KEY ni o‘qiydi. Mahalliy maxfiy kalit
sozlangan; uni robotning masʼul sozlovchisiga xavfsiz kanal orqali bering.

`.env` sozlamalari:
- ARRIVAL_ENABLED=1 (0 bo‘lsa kelish moduli o‘chadi)
- ARRIVAL_HOST=127.0.0.1
- ARRIVAL_PORT=8080
- DISPLAY_TIMEZONE=Asia/Tashkent
- CHILDREN_FILE — ixtiyoriy; standart asosiy papkadagi children.json

`children.json` hozir bo‘sh: hech qanday haqiqiy bola yoki ota-ona taxmin qilinmagan.
Telegramda /start → 🏫 Bog‘chaga kelish orqali ota-ona o‘z chat IDsini ko‘radi.
Masʼul ota-onalik va rozilikni tekshirgach children.example.json shaklida moslik kiritadi.
O‘zgartirishdan keyin botni qayta ishga tushiring. Profil ismi va yoshini tahrirlash
qurilmadagi child_id va children.json faylidagi ismni o‘zgartirmaydi.

Simulyator faqat ataylab tekshirish uchun: asosiy papkadan
`python3 arrival/simulate_robot.py`. U DEVICE_API_KEY muhit o‘zgaruvchisini talab qiladi.
Bu buyruqni ishlatish moslikdagi ota-onaga sunʼiy 36.6 °C xabar yuboradi.
Haqiqiy sensor testi emas. Oddiy avtomatik testlar Telegram xabari yubormaydi.
Serverning 202 queued javobi xabar navbatga olinganini bildiradi, yetkazilganini emas.

## 3. Haqiqiy robotdan yuboriladigan JSON

```json
{
  "event_id": "device01-arrival-000123",
  "child_id": "bola_001",
  "measured_at": "2026-10-18T08:20:00+05:00",
  "temperature_c": 36.6,
  "result": "in_range"
}
```

Manzil: https://SIZNING_SERVER/arrival
Headerlar: Content-Type: application/json va Authorization: Bearer MAXFIY_KALIT.
Qurilma bolaning QR/RFID kartasini aniqlaydi, o‘lchaydi va bitta kelish uchun bitta event_id
bilan yuboradi. Qayta urinishda event_id, vaqt va butun JSON bir xil qolsin.
Keyingi kelishda yangi event_id kerak. Sensorning har bir kadrini kelish deb yubormang.
Robot interneti uzilsa, robotning o‘zi yuborilmagan hodisalarni diskda saqlashi kerak;
server faqat o‘ziga yetib kelgan hodisalarni navbatga oladi.

result qiymatlari:
- in_range: tasdiqlangan qurilma qoidalari bo‘yicha o‘lchangan ko‘rsatkich oraliqda.
- attention: xodim tekshiruvi kerak.
- invalid: ishonchli o‘lchov olinmagan.

Kod tibbiy chegaralar o‘ylab topmaydi. Haqiqiy qurilmada natijani aniqlash qoidalari
sensor turi, o‘lchash usuli va pediatr tekshiruvi bilan sozlanishi kerak. 20..50 chegarasi
faqat buzilgan ma’lumotni to‘sish uchun; tibbiy normal oraliq emas.
Ushbu versiya faqat haroratni uzatadi; BP, SpO2 yoki yuzdan tashxis chiqarish yo‘q.

## Xabar misoli
🌿 GlowWell — bog‘chaga kelish

Farzandingiz Ali bog‘chaga keldi.
📅 O‘lchov vaqti: 18.10.2026 08:20 (+05)
🌡 Harorat: 36.6 °C
✅ O‘lchangan ko‘rsatkich belgilangan oraliqda.

Bu avtomatik o‘lchov xabari, tibbiy tashxis emas.

## Joylashtirish va cheklovlar
Server standart holatda faqat localhost:8080 ga ulanadi. Masofadagi robot uchun HTTPS
reverse proxy, firewall va doim ishlaydigan host kerak; Python HTTPServerni bevosita
ochiq internetga qo‘ymang. Bu hackathon adapteri, ishlab chiqarish uchun tayyor platforma emas.
Bitta server nusxasi ishlasin. asosiy papkadagi arrival.sqlite3 faylini doimiy diskda saqlang.
Xabar muvaffaqiyatli yuborilgach matn bazadan tozalanadi; yuborishdagi uzilishlarda qayta urinadi.
Telegram xabarni qabul qilib, server javobni ololmagan vaziyatda qayta yuborish dublikat
berishi mumkin (Telegram sendMessage exactly-once kafolatini bermaydi).
Noto‘g‘ri chat yoki ota-ona botni bloklasa, xabar tuzatilguncha navbatda qoladi.
Navbatni nazorat qilish, saqlash muddati/tozalash, shifrlangan disk va rozilik boshqaruvi
haqiqiy joriy etishdan oldin loyihangizga qo‘shilishi kerak. ZIPda haqiqiy bolalar yoki tokenlar yo‘q.

Tekshiruv (asosiy papkadan): `python3 -m unittest arrival.test_server test_integration -v`
Telegram API: https://core.telegram.org/bots/api#sendmessage

## Mavjud kundalik va o‘chirish

Profil, yillarda yosh kiritish va qo‘lda yozilgan kuzatuvlar saqlanadi. Avtomatik
kelish xabarlari hozir qo‘lda kiritilgan Tarix bo‘limiga qo‘shilmaydi.
Botdagi o‘chirish faqat kundalik profil va qo‘lda kiritilgan qaydlarni o‘chiradi.
Qurilma ulanishini bekor qilish uchun masʼul botni to‘xtatib, children.json dagi moslikni
olib tashlashi va arrival.sqlite3 outbox jadvalidagi tegishli chat_id qatorlarini o‘chirishi
kerak. Keyin botni qayta ishga tushiradi. Bu Telegramdagi avvalgi xabarlarni o‘chirmaydi.
