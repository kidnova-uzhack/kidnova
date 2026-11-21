# KidNova

**Bog'cha bolalari uchun kelish skriningi va ota-onalarni xabardor qilish tizimi** (UzHack 2026 MVP).

Bola bog'chaga kelganda KidNova qisqa skrining o'tkazadi (harorat, bo'y, vazn). Natija bog'cha xodimiga ko'rsatiladi va Telegram bot orqali ota-onaga yetkaziladi.

| | Havola |
|---|---|
| 🌐 Veb-platforma (jonli simulyatsiya) | https://kidnova-mvp.vercel.app/#demo |
| 🤖 Ota-onalar uchun Telegram bot | [@kidnova_uz_bot](https://t.me/kidnova_uz_bot) |

> Demo kirish ma'lumotlari va bir bosishda ulanish havolasi topshiriq formasida berilgan. Ular bu ochiq repozitoriyga ataylab yozilmagan.

## Asosiy jarayon

```
Bog'cha xodimi (sayt) ──check-in──▶ Supabase ──▶ Telegram bot ──▶ Ota-ona
   Demo bolani tanlaydi          skrining yozuvi      ~10 soniyada xabar,
   skriningni yakunlaydi         va xabarnoma         📊 Tarix
```

1. Ota-ona botni ochadi, maxfiylik shartlariga rozilik beradi va bog'cha bergan kod orqali farzandiga ulanadi.
2. Xodim saytda bolaning kelish skriningini yakunlaydi.
3. Bot natijani ota-onaga yuboradi. Tarix botning o'zida saqlanadi.

## Tuzilma

| Papka | Tarkibi |
|---|---|
| [`website/`](website/) | Statik veb-platforma (HTML/CSS/JS, UZ/EN/RU), Supabase sxemasi va RLS siyosatlari, admin panel |
| [`telegram-bot/`](telegram-bot/) | Python Telegram bot (faqat standart kutubxona), Supabase ko'prigi, shifokor qidiruvi, emlash eslatmalari, AI yordamchi, 102 ta avtomatik test |

Har bir papkaning o'z README fayli bor. Ikkala loyihaning commit tarixi saqlangan.

## Nima haqiqatan ishlaydi

- **Yagona ma'lumotlar bazasi (Supabase):** sayt va bot umumiy bazadan foydalanadi. Bot faqat server tomonidagi kalit bilan ishlaydi, brauzerga esa faqat ochiq (publishable) kalit beriladi.
- **Rolga asoslangan kirish (RLS):** xodim barcha demo profillarni ko'radi, ota-ona faqat o'z farzandini.
- **Telegram bot:** Railway serverida 24/7 ishlaydi. Unda quyidagilar bor:
  - bir nechta bolani ulash;
  - xabarnomalar va skrining tarixi;
  - emlash eslatmalari;
  - maxfiylik roziligi va ma'lumotlarni to'liq o'chirish.
- **Shifokor topish:** O'zbekiston bo'yicha ochiq geoma'lumotlar (OpenStreetMap). Mutaxassis bo'yicha filtr, Google / Yandex / Apple xaritalarida yo'nalish.
- **AI yordamchi:** ota-onalarning umumiy savollariga Google Gemini orqali javob beradi.

## Simulyatsiya qilingan qismlar

- KidNova roboti va RFID skaner dasturiy simulyatsiya qilingan, jismoniy qurilma ishlatilmagan.
- Harorat, bo'y va vazn namunaviy qiymatlar, real sensorlardan olinmagan.
- Demo Child A–F profillari sun'iy, haqiqiy shaxsiy ma'lumotlardan foydalanilmagan.
- Tizim tashxis qo'ymaydi. U faqat xodim ko'rigi zarurligini belgilaydi.

## Xavfsizlik

- Kalitlar, tokenlar va parollar repozitoriyda yo'q: ular server muhit o'zgaruvchilarida (`.env`, Railway Variables) saqlanadi.
- Ulanish kodlari bazada faqat SHA-256 xesh ko'rinishida saqlanadi. Bir martalik kodlar 24 soat amal qiladi.
- Botdagi Telegram ID va ulanishlar jadvallari brauzer uchun yopiq: RLS yoqilgan, ularga faqat `service_role` kira oladi.

## Mahalliy ishga tushirish

```bash
# Telegram bot (Python 3.10+)
cd telegram-bot
cp .env.example .env      # BOT_TOKEN, SUPABASE_* va boshqalarni to'ldiring
python3 -u bot.py
python3 -m unittest test_consent test_supabase_bridge test_care test_ai test_telegram_connection

# Veb-platforma
cd website
python3 -m http.server 8000   # http://localhost:8000
```

Supabase sozlash: [`website/supabase/README.md`](website/supabase/README.md), keyin [`telegram-bot/supabase/`](telegram-bot/supabase/) dagi SQL fayllar ketma-ket ishga tushiriladi.

## Sun'iy intellektdan foydalanish

- **Google Gemini:** mahsulot ichida, botdagi "ℹ️ Yordam" bo'limi. Bola profili va shaxsiy ma'lumotlar yuborilmaydi.
- **Claude (Anthropic) va Codex (OpenAI):** ishlab chiqishda yordamchi vosita sifatida ishlatildi (kod, testlar, xavfsizlik tekshiruvi). Arxitektura va mahsulot qarorlarini jamoa qabul qilgan.
