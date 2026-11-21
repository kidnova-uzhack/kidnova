# KidNova ↔ Telegram bot: ulash qo'llanmasi

Barcha bolalar uydirma (Demo Child A–F). Haqiqiy bola ma'lumotini kiritmang.

## 1. SQL'ni bir marta ishga tushirish
Supabase → SQL Editor → New query → `supabase/telegram_bridge.sql` matnini to'liq qo'ying → Run. Keyin xuddi shunday `supabase/telegram_multi_child.sql` ni ham Run qiling (bitta chatga bir nechta bola ulanadi).
Bu faqat yangi jadval va funksiyalar qo'shadi; saytning mavjud jadvallari o'zgarmaydi.

## 2. Botning `.env` fayli
```
SUPABASE_URL=https://zqrnpawwyppypqsgmpde.supabase.co
SUPABASE_SECRET_KEY=<Supabase → Project Settings → API Keys → Secret key>
SUPABASE_DELIVERY=preview
```
Secret kalitni hech kimga yubormang, chatga yozmang, git'ga qo'shmang, sayt kodiga qo'ymang.

## 3. Ota-onani ulash
1. Xodim: `python3 scripts/link_code_admin.py SIM-RFID-A` → `KN-XXXXXX` kodi chiqadi (24 soat, bir martalik).
2. Ota-ona botga: `/link KN-XXXXXX`.
3. Uzish: `/unlink` yoki 🗑 Ma'lumotlarni o'chirish.

## 4. Qanday ishlaydi
- Saytda xodim check-in qilganda (`kidnova_record_demo_checkin`) bot ~10 soniyada uni ko'radi.
- `preview` rejimida xabar faqat bot konsoliga chiqadi, Telegramga yuborilmaydi.
- `send` rejimida ulangan ota-onaga o'zbekcha xabar yuboriladi (5 martagacha qayta urinadi).
- 📊 Tarix: ota-onaning o'z qaydlari + faqat o'z farzandining KidNova tekshiruvlari.
- Faqat ulanishdan KEYINgi check-in'lar xabar sifatida yuboriladi; eskilari faqat Tarixda ko'rinadi.
