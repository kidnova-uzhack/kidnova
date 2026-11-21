# KidNova hosted MVP validation — 2026-11-09

Environment: hosted `kidnova-mvp` Supabase project in Singapore and the local static website served over HTTP for browser integration testing.

## Passed

- Schema applied successfully to hosted PostgreSQL.
- RLS enabled on all five exposed demo tables.
- `anon` has no table read access and no RPC execution access.
- `authenticated` has no direct insert, update, or delete privileges on demo tables.
- The three browser RPCs are restricted to `authenticated` and use an empty function `search_path`.
- Dedicated confirmed Staff and Parent Auth users were created; open sign-up and anonymous sign-in are disabled.
- Parent is assigned only to fictional `Demo Child A`.
- Staff login succeeded through the browser using the public publishable key.
- `SIM-RFID-A` + synthetic 38.4°C produced exactly one attendance, screening, and notification-preview row.
- The database set the staff-review flag, and Staff acknowledgement persisted.
- Parent login showed only the assigned child's saved 38.4°C record and exact stored notification preview.
- Duplicate same-day check-in was rejected using the Tashkent calendar date.
- Unknown RFID and invalid temperature were rejected.
- Parent check-in and Parent alert-review RPC calls were rejected with `staff_role_required`.
- Reload preserved the authenticated session and database-backed history.

Final test counts: 1 attendance, 1 screening, 1 notification preview, and 1 reviewed alert. All data is fictional and synthetic.

## Not yet tested

- A public Vercel deployment URL.
- HTTPS behavior and response headers on the final public host.
- Mobile-network and independent-device testing of the final public URL.
- Real RFID, physical sensors, Telegram delivery, clinical accuracy, or medical use.

Do not present those untested items as complete.
