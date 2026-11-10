# KidNova / GlowWell bot

This is the existing Python Telegram bot project. Preserve `glowwell.db` and
`arrival.sqlite3` when working on a live installation. Never commit `.env`, QR
card images, `children.json`, database files, or API tokens.

## Setup

1. Copy `.env.example` to `.env` and fill in local secrets.
2. Run `python3 -u bot.py`.
3. Run tests with:
   `python3 -m unittest test_supabase_bridge test_rfid_simulation test_hardware_adapters test_qr_checkin arrival.test_server test_integration test_ai test_care test_nearby test_clinic_phones test_telegram_connection -q`

The project uses the Python standard library at runtime. QR card image generation
is an operator-only feature and uses `requirements-qr.txt`.

## Architecture

- `bot.py`: Telegram polling, child profiles, manual screening history, menus.
- `glowwell.db`: existing profile, screening, session, vaccination, and QR hash data.
- `arrival/server.py`: authenticated device check-in API and notification outbox.
- `arrival.sqlite3`: durable notification queue.
- `qr_identity.py`: opaque QR credential issue, hash, resolve, and revoke logic.
- `scripts/qr_admin.py`: local staff tool for issuing and revoking QR cards.
- `care.py`, `nearby.py`: vaccination reminders and nearby clinic search.
- `ai_assistant.py`: optional OpenAI-backed parent help flow.
- `supabase_bridge.py`: KidNova Supabase link (/link, history, check-in notifications). SQL: `supabase/telegram_bridge.sql`. `SUPABASE_DELIVERY=preview` by default; `send` only with explicit human approval.

Tests must use temporary databases and synthetic child data. Mock or disable
Telegram delivery during tests. Do not deploy or send real messages unless the
human user explicitly authorizes it.
