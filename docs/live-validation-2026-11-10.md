# KidNova hosted MVP validation — 2026-11-10

Environment: hosted `kidnova-mvp` Supabase project in Singapore and the local static website served over HTTP for browser integration testing.

## Passed

- Reapplied `supabase/schema.sql` successfully to the hosted project.
- Verified the five demo tables exist with RLS enabled.
- Verified the five authenticated read policies are present.
- Verified all four browser RPCs use `SECURITY DEFINER` with an empty `search_path`.
- Verified `anon` cannot execute the RPCs and `authenticated` can.
- Verified browser roles have no direct table insert, update, or delete privileges.
- Verified the Staff and Parent Auth users exist and have the intended database roles.
- Verified the Parent role is assigned only to fictional `Demo Child A`.
- Confirmed the frontend uses the hosted project URL and a public publishable key only.
- Staff login succeeded through the browser.
- `SIM-RFID-A` saved a synthetic 36.6°C attendance and screening record for 2026-11-10.
- `SIM-RFID-B` saved a synthetic 38.4°C attendance and screening record for 2026-11-10.
- The database set the Staff-review flag for the 38.4°C scenario, and Staff acknowledgement persisted.
- Parent login showed only Demo Child A and its authorized history; Demo Child B and Staff-only controls were absent.
- Final hosted counts were four attendance, four screening, and four notification-preview rows across 2026-11-09 and 2026-11-10.
- Every notification record remained `preview_only`; no Telegram message was sent.
- Frontend JavaScript syntax checks passed, and no secret or service-role key was present in browser configuration.

All children, RFID codes, measurements, and records used in this validation are fictional and synthetic.

## Not tested in this run

- A public Vercel deployment URL.
- HTTPS behavior and response headers on the final public host.
- Mobile-network or independent-device testing of the final public URL.
- Real RFID hardware, physical sensors, Telegram delivery, clinical accuracy, or medical use.

Do not present these untested items as complete.
