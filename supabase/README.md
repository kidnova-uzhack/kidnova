# KidNova hosted browser demo: Supabase setup

The site uses dedicated email/password demo accounts. It does not sign visitors up anonymously. Staff can create synthetic attendance and screening records; a parent account can read only the single fictional child assigned to it. Browser code uses the Supabase project URL and public publishable/legacy anon key only. **Never add a secret or `service_role` key to this repository or browser.**

## 1. Create a project

1. Create a project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Wait for the database to finish provisioning. Save the database password in a password manager; it is not needed in the website.
3. Keep the project region appropriate for your expected users and review the project's backup and log-retention settings.

## 2. Configure Authentication

In **Authentication → Sign In / Providers**:

1. Enable the **Email** provider and password sign-in.
2. Disable **Anonymous Sign-Ins**; the site no longer creates anonymous users.
3. Disable public sign-up because this is a seeded judge demo, not an open registration flow.
4. If you create accounts manually in the Dashboard, confirm/verify those demo users there (or use the dashboard's confirmation option). Do not put demo passwords into source files.
5. Configure Auth rate limits appropriate for a small public demo. Share test credentials only with intended judges.

## 3. Apply the database schema and seed synthetic children

Open **SQL Editor → New query**, paste the complete contents of [`schema.sql`](./schema.sql), and run it once. The script creates the five tables, RLS policies, grants and two fictional profiles (`Demo Child A` / `SIM-RFID-A`, and `Demo Child B` / `SIM-RFID-B`). It does not create Auth accounts or insert real child data.

This schema targets a fresh KidNova Supabase database. The previous prototype schema used anonymous-user-owned tables and is not a compatible in-place migration. If that earlier SQL was already applied, export anything you need first; it contains synthetic demo records only. Use a fresh Supabase project or deliberately remove those old demo tables/policies after backup before applying this schema. Do not run it against a database containing unrelated application data.

After the script runs, check **Database → Tables** for `demo_children`, `kidnova_demo_roles`, `attendance_records`, `screening_records`, and `notification_records`. Verify that RLS is enabled on all five.

## 4. Create the dedicated demo accounts

In **Authentication → Users**, add two users with passwords generated and shared out of band:

- One email/password account for the **staff demo**.
- One separate email/password account for the **parent demo**.

Use accounts/mailboxes controlled by the project team. Avoid personal or production user accounts. The staff account can read both synthetic profiles and make one check-in per profile per Tashkent calendar day. The parent account is linked below to Demo Child A and can read only that child's synthetic records.

After creating both users, open **SQL Editor** and substitute the two actual demo emails in this statement. The statement assigns the database roles; metadata supplied by users cannot change them:

```sql
insert into public.kidnova_demo_roles(user_id, role, child_id)
select u.id, 'staff', null
from auth.users u
where u.email = 'REPLACE_WITH_STAFF_DEMO_EMAIL'
on conflict (user_id) do update set role = excluded.role, child_id = excluded.child_id;

insert into public.kidnova_demo_roles(user_id, role, child_id)
select u.id, 'parent', c.id
from auth.users u
cross join public.demo_children c
where u.email = 'REPLACE_WITH_PARENT_DEMO_EMAIL'
  and c.wristband_code = 'SIM-RFID-A'
on conflict (user_id) do update set role = excluded.role, child_id = excluded.child_id;
```

Check that both rows were inserted and the parent is assigned to exactly one child:

```sql
select r.role, u.email, c.display_name, c.wristband_code
from public.kidnova_demo_roles r
join auth.users u on u.id = r.user_id
left join public.demo_children c on c.id = r.child_id
order by r.role;
```

This role mapping table is not writable by browser roles. Only a trusted Supabase administrator can assign roles. Do not grant `authenticated`, `anon`, or `public` insert/update/delete privileges on it.

## 5. Configure the website

Edit [`../supabase-config.js`](../supabase-config.js) and set:

```js
window.KIDNOVA_SUPABASE_CONFIG = Object.freeze({
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_LEGACY_ANON_KEY'
});
```

Find the URL and public key in **Project Settings → API** (dashboard labels can vary). Only use the publishable key (`sb_publishable_…`) or the legacy public `anon` key. The browser client rejects keys identified as `sb_secret_…` and legacy JWTs whose role is not `anon`. Never use a `secret` key or `service_role` key in this file, JavaScript, HTML, CSS, or any static hosting environment variable exposed to the browser.

Serve/deploy the static site over HTTPS. In the demo section, sign in with a seeded email/password account. A successful sign-in and role-scoped `kidnova_demo_state()` call should show a role-specific connected status. If the browser reports a missing role, recheck the role mapping query above. If it reports a missing RPC/table, rerun the schema on the intended empty project and inspect the SQL Editor result.

## 6. Expected demo behavior and security boundary

- Staff records a check-in by simulated RFID code. The server resolves the code; arbitrary child IDs are not accepted by the write RPC.
- The database calculates the date in `Asia/Tashkent` and enforces `unique(child_id, attendance_date)`, so concurrent duplicate check-ins cannot create two rows for the same child/day.
- A valid screening, attendance row, and `preview_only` notification record are written in the same PostgreSQL RPC transaction. Any error rolls the transaction back.
- The synthetic review flag is computed server-side for values at/above 37.5°C or at/below 35.0°C. It is a demo workflow flag only, not clinical guidance or a diagnosis. The UI warns staff to review it.
- Staff can acknowledge a flagged record with `kidnova_review_demo_alert()`. This writes a timestamp and staff account ID through a separate staff-only RPC. The parent can see whether a staff acknowledgement is pending or recorded. It does not attest to clinical assessment, treatment, or diagnosis.
- Staff can use `kidnova_reset_demo_day()` to remove only the selected fictional child's current Tashkent-day attendance record. Cascading foreign keys remove that record's screening and notification preview so judges can repeat the demo. Parent accounts cannot call this reset RPC, and older dates are untouched.
- The reviewer's internal Auth UUID is stored for audit in `reviewed_by`, but that column is deliberately excluded from browser `SELECT` grants. The UI and role-scoped state RPC expose the acknowledgement timestamp only.
- Parents can only read the child selected in their administrator-assigned role row. They cannot write records or inspect other children's records using table APIs or the RPC.
- Notification records are message previews only. The exact stored preview is returned by the role-scoped state RPC and displayed to the assigned parent; no Telegram message is delivered.
- All profiles, RFID codes and measurements are fictional/synthetic. Never enter real children's personal or health data.

## 7. Validation queries

After a staff test, these queries can verify actual persisted rows in the Dashboard SQL Editor:

```sql
select c.display_name, a.attendance_date, a.identified_by, a.created_at
from public.attendance_records a join public.demo_children c on c.id = a.child_id
order by a.created_at desc;

select c.display_name, s.temperature_c, s.requires_staff_review, s.measurement_source, s.created_at
from public.screening_records s join public.demo_children c on c.id = s.child_id
order by s.created_at desc;

select c.display_name, s.requires_staff_review, s.reviewed_at, s.reviewed_by
from public.screening_records s join public.demo_children c on c.id = s.child_id
order by s.created_at desc;

select c.display_name, n.channel, n.delivery_status, n.message_preview, n.created_at
from public.notification_records n join public.demo_children c on c.id = n.child_id
order by n.created_at desc;
```

The repository alone cannot prove a hosted database works. Complete the role-isolation, persistence, duplicate, invalid RFID and direct table-denial checks against your actual configured project before presenting the browser demo as live.

### Hosted integration runbook

1. Open the site in Browser A and sign in as staff. Select Demo Child A, choose **Attention required**, and begin. The synthetic value is 38.4°C. Expected: a new attendance, screening, and preview row; an in-page staff-review warning; the status explicitly says no Telegram message was sent.
2. Run the validation queries above in SQL Editor. Expected: exactly one row for that child/date in each table, `requires_staff_review = true`, `reviewed_at` initially null, and `delivery_status = preview_only`.
3. In the staff browser, use **Mark alert reviewed**. Expected: `reviewed_at` and `reviewed_by` are set once, the staff history shows an acknowledgement, and the UI explicitly says this is not a medical assessment.
4. Open a separate browser profile as parent. Sign in with the parent account assigned to Demo Child A. Expected: the saved A screening and review flag are visible in history, with the staff-acknowledgement state. Parent users have no control to acknowledge alerts.
5. In the staff and parent browsers, reload. Expected: the login session and authorized saved rows persist. Staff sees both demo profiles; parent sees only A.
6. Repeat the staff check-in for A on the same Tashkent calendar day. Expected: the UI reports a duplicate and the SQL row counts remain unchanged.
7. While signed in as staff, use the browser console to confirm an unknown RFID is rejected (this does not write a row):

   ```js
   await KidNovaSupabase.rpc('kidnova_record_demo_checkin', {
     p_rfid_code: 'SIM-RFID-UNKNOWN',
     p_temperature_c: 38.4,
     p_height_cm: 104,
     p_weight_kg: 17.2
   })
   ```

   Expected: a `unknown_rfid` database error.
8. While signed in as parent, try the check-in or review RPC. Expected: `staff_role_required`. A direct select of Demo Child B and B's dependent records should return zero rows under RLS; direct insert/update/delete attempts should be denied because the browser roles have no table write grants.

Record the result of each step against the actual project. Do not treat the mock client test or visual browser check as evidence that hosted PostgreSQL, Auth, RLS, or RPC behavior passed.
