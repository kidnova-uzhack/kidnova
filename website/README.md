# KidNova UzHack MVP

Static bilingual KidNova website with a hosted Supabase demo backend. RFID, infrared temperature, height, weight, and Telegram delivery are explicitly simulated. Attendance, screening, review state, and notification previews persist in PostgreSQL.

## Deployment

1. Deploy this folder as a static Vercel project with no build command.
2. Keep `vercel.json`; it limits browser capabilities and permits API connections only to this KidNova Supabase project.
3. Do not add a Supabase secret or `service_role` key. `supabase-config.js` intentionally contains only the browser-safe project URL and publishable key.
4. Share Staff and Parent credentials out of band. Do not commit passwords or place them in the page.
5. After the first deployment, replace `content="kidnova-social.png"` in `index.html` (`og:image`) with the full public URL, for example `https://YOUR-DOMAIN/kidnova-social.png`. Telegram, Facebook and LinkedIn only show the preview image for an absolute URL.
6. To enable Demo Child C–F on an existing hosted database, run [`supabase/add-demo-children.sql`](supabase/add-demo-children.sql) once in the Supabase SQL Editor. Without it, the live mode shows only Child A and B; guest mode shows all six.
7. After deployment, repeat the staff 38.4°C and parent-history checks in an incognito window and on a phone before submitting the public URL.

## Demo modes

- **Guest mode** (default, no sign-in): the whole screening flow and the auto-demo run in the browser. Nothing is saved.
- **Live mode** (staff or parent demo account): check-ins are saved to Supabase. A second check-in for the same child on the same Tashkent day is blocked and shown as a "checked in today" badge; staff can reset that child's current day.

## Verified hosted flow

See [`docs/live-validation-2026-11-10.md`](docs/live-validation-2026-11-10.md). The hosted database and local browser integration were tested on November 10, 2026. Public-host behavior must still be verified after each deployment.

Database installation and account setup are documented in [`supabase/README.md`](supabase/README.md).
