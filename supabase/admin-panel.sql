-- KidNova admin panel: kindergartens, robots, service tickets, audit log and admin roles.
-- Run once in Supabase → SQL Editor AFTER schema.sql, add-demo-children.sql and the Telegram bridge SQL.
-- Additive only: existing demo, staff/parent accounts and the Telegram bot keep working.
-- Synthetic data only. Browser roles get no direct table access; everything goes through
-- SECURITY DEFINER functions that check the caller's role and kindergarten first.
begin;

-- ───────────────────────── 1. Tables ─────────────────────────
create table if not exists public.kindergartens (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^KG-[0-9]{2}$'),
  name text not null check (char_length(name) between 3 and 80),
  city text not null check (char_length(city) between 2 and 60),
  status text not null default 'pilot' check (status in ('pilot','active','paused')),
  created_at timestamptz not null default now()
);
insert into public.kindergartens(code, name, city, status) values
  ('KG-01', 'Demo bog‘cha №1', 'Farg‘ona', 'pilot'),
  ('KG-02', 'Demo bog‘cha №2', 'Marg‘ilon', 'pilot')
on conflict (code) do nothing;

alter table public.demo_children add column if not exists kindergarten_id uuid references public.kindergartens(id) on delete restrict;
alter table public.demo_children add column if not exists group_name text check (group_name is null or char_length(group_name) <= 40);
update public.demo_children c
   set kindergarten_id = k.id
  from public.kindergartens k
 where c.kindergarten_id is null
   and k.code = case when c.wristband_code in ('SIM-RFID-A','SIM-RFID-B','SIM-RFID-C') then 'KG-01' else 'KG-02' end;
update public.demo_children set group_name = case
    when wristband_code in ('SIM-RFID-A','SIM-RFID-C','SIM-RFID-E') then 'Kichik guruh'
    else 'Katta guruh' end
 where group_name is null;
alter table public.demo_children alter column kindergarten_id set not null;

alter table public.kidnova_demo_roles add column if not exists kindergarten_id uuid references public.kindergartens(id) on delete cascade;
alter table public.kidnova_demo_roles drop constraint if exists kidnova_demo_roles_role_check;
alter table public.kidnova_demo_roles add constraint kidnova_demo_roles_role_check
  check (role in ('staff','parent','kindergarten_admin','kidnova_admin'));
alter table public.kidnova_demo_roles drop constraint if exists demo_role_child_scope;
alter table public.kidnova_demo_roles add constraint demo_role_child_scope check (
  (role = 'staff' and child_id is null) or
  (role = 'parent' and child_id is not null) or
  (role = 'kindergarten_admin' and child_id is null and kindergarten_id is not null) or
  (role = 'kidnova_admin' and child_id is null and kindergarten_id is null)
);

create table if not exists public.robots (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^KN-ST-[0-9]{3}$'),
  kindergarten_id uuid not null references public.kindergartens(id) on delete restrict,
  status text not null default 'online' check (status in ('online','offline','maintenance')),
  last_seen_at timestamptz,
  last_calibrated_at date,
  firmware text not null default 'sim-0.3' check (char_length(firmware) <= 20),
  is_simulated boolean not null default true check (is_simulated),
  created_at timestamptz not null default now()
);
insert into public.robots(serial, kindergarten_id, status, last_seen_at, last_calibrated_at)
select v.serial, k.id, v.status, now() - v.ago, current_date - v.cal
  from (values
    ('KN-ST-001', 'KG-01', 'online',      interval '3 minutes', 12),
    ('KN-ST-002', 'KG-01', 'maintenance', interval '2 days',    40),
    ('KN-ST-003', 'KG-02', 'online',      interval '7 minutes', 20)
  ) as v(serial, kg, status, ago, cal)
  join public.kindergartens k on k.code = v.kg
on conflict (serial) do nothing;

create table if not exists public.service_tickets (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  robot_id uuid references public.robots(id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  assigned_to text check (assigned_to is null or char_length(assigned_to) <= 60),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
insert into public.service_tickets(kindergarten_id, robot_id, title, details, status, assigned_to)
select r.kindergarten_id, r.id, 'Harorat sensori kalibrovkasi', 'Simulyatsiya: rejali kalibrovka muddati o‘tgan.', 'in_progress', 'Texnik (demo)'
  from public.robots r
 where r.serial = 'KN-ST-002'
   and not exists (select 1 from public.service_tickets t where t.robot_id = r.id);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  actor_role text,
  kindergarten_id uuid references public.kindergartens(id) on delete cascade,
  action text not null check (char_length(action) <= 60),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.kindergartens enable row level security;
alter table public.robots enable row level security;
alter table public.service_tickets enable row level security;
alter table public.admin_audit_log enable row level security;
revoke all on public.kindergartens, public.robots, public.service_tickets, public.admin_audit_log from public, anon, authenticated;

-- ───────────────────────── 2. Internal helpers (not callable from the browser) ─────────────────────────
create or replace function public.kidnova_admin_scope(p_need text)
returns table(role text, kindergarten_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_kg uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select r.role, r.kindergarten_id into v_role, v_kg from public.kidnova_demo_roles r where r.user_id = auth.uid();
  if v_role is null or v_role not in ('kindergarten_admin','kidnova_admin') then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;
  if p_need = 'kindergarten' and v_role <> 'kindergarten_admin' then raise exception 'kindergarten_admin_required' using errcode = '42501'; end if;
  if p_need = 'kidnova' and v_role <> 'kidnova_admin' then raise exception 'kidnova_admin_required' using errcode = '42501'; end if;
  return query select v_role, v_kg;
end;
$$;

create or replace function public.kidnova_audit(p_role text, p_kg uuid, p_action text, p_details jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.admin_audit_log(actor, actor_role, kindergarten_id, action, details)
  values (auth.uid(), p_role, p_kg, p_action, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.kidnova_tashkent_today()
returns date language sql stable set search_path = ''
as $$ select timezone('Asia/Tashkent', now())::date $$;

-- ───────────────────────── 3. Shared ─────────────────────────
create or replace function public.kidnova_admin_whoami()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_kg uuid; v_kg_json jsonb;
begin
  select s.role, s.kindergarten_id into v_role, v_kg from public.kidnova_admin_scope('any') s;
  if v_kg is not null then
    select jsonb_build_object('id', k.id, 'code', k.code, 'name', k.name, 'city', k.city, 'status', k.status)
      into v_kg_json from public.kindergartens k where k.id = v_kg;
  end if;
  return jsonb_build_object('role', v_role, 'kindergarten', v_kg_json, 'today', public.kidnova_tashkent_today());
end;
$$;

create or replace function public.kidnova_admin_audit(p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_kg uuid;
begin
  select s.role, s.kindergarten_id into v_role, v_kg from public.kidnova_admin_scope('any') s;
  return coalesce((
    select jsonb_agg(jsonb_build_object('at', a.created_at, 'role', a.actor_role, 'action', a.action,
             'kindergarten', k.name, 'details', a.details) order by a.created_at desc)
      from (select * from public.admin_audit_log l
             where v_role = 'kidnova_admin' or l.kindergarten_id = v_kg
             order by l.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)) a
      left join public.kindergartens k on k.id = a.kindergarten_id
  ), '[]'::jsonb);
end;
$$;

-- ───────────────────────── 4. Kindergarten admin (own kindergarten only) ─────────────────────────
create or replace function public.kidnova_kg_dashboard()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_today date := public.kidnova_tashkent_today();
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  return jsonb_build_object(
    'today', v_today,
    'children_total', (select count(*) from public.demo_children c where c.kindergarten_id = v_kg),
    'checked_in_today', (select count(*) from public.attendance_records a join public.demo_children c on c.id = a.child_id
                          where c.kindergarten_id = v_kg and a.attendance_date = v_today),
    'alerts_today', (select count(*) from public.screening_records s join public.attendance_records a on a.id = s.attendance_id
                      join public.demo_children c on c.id = s.child_id
                      where c.kindergarten_id = v_kg and a.attendance_date = v_today and s.requires_staff_review),
    'alerts_pending', (select count(*) from public.screening_records s join public.demo_children c on c.id = s.child_id
                        where c.kindergarten_id = v_kg and s.requires_staff_review and s.reviewed_at is null),
    'notifications_today', (select count(*) from public.notification_records n join public.demo_children c on c.id = n.child_id
                             where c.kindergarten_id = v_kg and timezone('Asia/Tashkent', n.created_at)::date = v_today),
    'telegram_linked_children', (select count(distinct l.child_id) from public.telegram_links l join public.demo_children c on c.id = l.child_id
                                  where c.kindergarten_id = v_kg),
    'robots', coalesce((select jsonb_agg(jsonb_build_object('serial', r.serial, 'status', r.status, 'last_seen_at', r.last_seen_at) order by r.serial)
                          from public.robots r where r.kindergarten_id = v_kg), '[]'::jsonb),
    'open_tickets', (select count(*) from public.service_tickets t where t.kindergarten_id = v_kg and t.status <> 'resolved'),
    'week', coalesce((select jsonb_agg(jsonb_build_object('date', d::date, 'count',
                 (select count(*) from public.attendance_records a join public.demo_children c on c.id = a.child_id
                   where c.kindergarten_id = v_kg and a.attendance_date = d::date)) order by d)
               from generate_series((v_today - 6)::timestamp, v_today::timestamp, interval '1 day') d), '[]'::jsonb)
  );
end;
$$;

create or replace function public.kidnova_kg_children()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'display_name', c.display_name, 'wristband_code', c.wristband_code, 'group_name', c.group_name,
      'last_date', last.attendance_date, 'last_temperature_c', last.temperature_c,
      'last_height_cm', last.height_cm, 'last_weight_kg', last.weight_kg,
      'visits', (select count(*) from public.attendance_records a where a.child_id = c.id),
      'pending_alert', exists (select 1 from public.screening_records s where s.child_id = c.id and s.requires_staff_review and s.reviewed_at is null),
      'telegram_linked', exists (select 1 from public.telegram_links l where l.child_id = c.id)
    ) order by c.wristband_code)
    from public.demo_children c
    left join lateral (
      select a.attendance_date, s.temperature_c, s.height_cm, s.weight_kg
        from public.attendance_records a join public.screening_records s on s.attendance_id = a.id
       where a.child_id = c.id order by a.attendance_date desc limit 1
    ) last on true
    where c.kindergarten_id = v_kg
  ), '[]'::jsonb);
end;
$$;

create or replace function public.kidnova_kg_child_history(p_child uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  if not exists (select 1 from public.demo_children c where c.id = p_child and c.kindergarten_id = v_kg) then
    raise exception 'child_not_in_kindergarten' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('date', a.attendance_date, 'temperature_c', s.temperature_c, 'height_cm', s.height_cm,
             'weight_kg', s.weight_kg, 'requires_staff_review', s.requires_staff_review, 'reviewed_at', s.reviewed_at)
           order by a.attendance_date)
      from (select * from public.attendance_records x where x.child_id = p_child order by x.attendance_date desc limit 60) a
      join public.screening_records s on s.attendance_id = a.id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.kidnova_kg_attendance(p_from date, p_to date)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_from date := coalesce(p_from, public.kidnova_tashkent_today() - 6); v_to date := coalesce(p_to, public.kidnova_tashkent_today());
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  if v_to < v_from or v_to - v_from > 92 then raise exception 'invalid_date_range' using errcode = '22023'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('date', a.attendance_date, 'checked_in_at', a.created_at, 'child', c.display_name,
             'wristband_code', c.wristband_code, 'group_name', c.group_name, 'temperature_c', s.temperature_c,
             'height_cm', s.height_cm, 'weight_kg', s.weight_kg, 'requires_staff_review', s.requires_staff_review,
             'reviewed_at', s.reviewed_at) order by a.attendance_date desc, a.created_at desc)
      from public.attendance_records a
      join public.demo_children c on c.id = a.child_id
      join public.screening_records s on s.attendance_id = a.id
     where c.kindergarten_id = v_kg and a.attendance_date between v_from and v_to
  ), '[]'::jsonb);
end;
$$;

create or replace function public.kidnova_kg_alerts()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  return coalesce((
    select jsonb_agg(jsonb_build_object('screening_id', s.id, 'date', a.attendance_date, 'child', c.display_name,
             'wristband_code', c.wristband_code, 'temperature_c', s.temperature_c, 'reviewed_at', s.reviewed_at)
           order by (s.reviewed_at is null) desc, a.attendance_date desc)
      from public.screening_records s
      join public.attendance_records a on a.id = s.attendance_id
      join public.demo_children c on c.id = s.child_id
     where c.kindergarten_id = v_kg and s.requires_staff_review
       and a.attendance_date >= public.kidnova_tashkent_today() - 30
  ), '[]'::jsonb);
end;
$$;

create or replace function public.kidnova_kg_review_alert(p_screening_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_code text; v_at timestamptz;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  update public.screening_records s
     set reviewed_at = coalesce(s.reviewed_at, now()), reviewed_by = coalesce(s.reviewed_by, auth.uid())
    from public.demo_children c
   where s.id = p_screening_id and c.id = s.child_id and c.kindergarten_id = v_kg and s.requires_staff_review
  returning s.reviewed_at, c.wristband_code into v_at, v_code;
  if not found then raise exception 'reviewable_alert_not_found' using errcode = '22023'; end if;
  perform public.kidnova_audit('kindergarten_admin', v_kg, 'alert_reviewed', jsonb_build_object('wristband_code', v_code));
  return jsonb_build_object('ok', true, 'reviewed_at', v_at);
end;
$$;

create or replace function public.kidnova_kg_add_child(p_group text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_letter text; v_id uuid;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  if p_group is not null and char_length(p_group) > 40 then raise exception 'invalid_group' using errcode = '22023'; end if;
  select l into v_letter
    from unnest(string_to_array('A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z', ',')) l
   where not exists (select 1 from public.demo_children c where c.wristband_code = 'SIM-RFID-' || l)
   order by l limit 1;
  if v_letter is null then raise exception 'no_synthetic_slots' using errcode = '22023'; end if;
  insert into public.demo_children(display_name, wristband_code, kindergarten_id, group_name)
  values ('Demo Child ' || v_letter, 'SIM-RFID-' || v_letter, v_kg, nullif(btrim(p_group), ''))
  returning id into v_id;
  perform public.kidnova_audit('kindergarten_admin', v_kg, 'child_added', jsonb_build_object('wristband_code', 'SIM-RFID-' || v_letter));
  return jsonb_build_object('ok', true, 'id', v_id, 'display_name', 'Demo Child ' || v_letter, 'wristband_code', 'SIM-RFID-' || v_letter);
end;
$$;

create or replace function public.kidnova_kg_create_link_code(p_child uuid, p_code_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_code text; v_expires timestamptz;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_code_hash' using errcode = '22023'; end if;
  select c.wristband_code into v_code from public.demo_children c where c.id = p_child and c.kindergarten_id = v_kg;
  if v_code is null then raise exception 'child_not_in_kindergarten' using errcode = '42501'; end if;
  insert into public.telegram_link_codes(code_hash, child_id) values (p_code_hash, p_child) returning expires_at into v_expires;
  perform public.kidnova_audit('kindergarten_admin', v_kg, 'telegram_code_created', jsonb_build_object('wristband_code', v_code));
  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

create or replace function public.kidnova_kg_robots()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  return jsonb_build_object(
    'robots', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'serial', r.serial, 'status', r.status, 'last_seen_at', r.last_seen_at,
                 'last_calibrated_at', r.last_calibrated_at, 'firmware', r.firmware, 'is_simulated', r.is_simulated) order by r.serial)
               from public.robots r where r.kindergarten_id = v_kg), '[]'::jsonb),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'robot', r.serial, 'title', t.title, 'details', t.details,
                 'status', t.status, 'assigned_to', t.assigned_to, 'created_at', t.created_at, 'resolved_at', t.resolved_at) order by t.created_at desc)
               from public.service_tickets t left join public.robots r on r.id = t.robot_id where t.kindergarten_id = v_kg), '[]'::jsonb)
  );
end;
$$;

create or replace function public.kidnova_kg_create_ticket(p_robot uuid, p_title text, p_details text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_id uuid; v_serial text;
begin
  select s.kindergarten_id into v_kg from public.kidnova_admin_scope('kindergarten') s;
  if p_robot is not null then
    select r.serial into v_serial from public.robots r where r.id = p_robot and r.kindergarten_id = v_kg;
    if v_serial is null then raise exception 'robot_not_in_kindergarten' using errcode = '42501'; end if;
  end if;
  if p_title is null or char_length(btrim(p_title)) < 3 or char_length(p_title) > 120 then raise exception 'invalid_title' using errcode = '22023'; end if;
  if p_details is not null and char_length(p_details) > 500 then raise exception 'invalid_details' using errcode = '22023'; end if;
  insert into public.service_tickets(kindergarten_id, robot_id, title, details, created_by)
  values (v_kg, p_robot, btrim(p_title), nullif(btrim(p_details), ''), auth.uid()) returning id into v_id;
  perform public.kidnova_audit('kindergarten_admin', v_kg, 'ticket_created', jsonb_build_object('robot', v_serial, 'title', btrim(p_title)));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ───────────────────────── 5. KidNova team (all kindergartens, no child identities) ─────────────────────────
create or replace function public.kidnova_hq_overview()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_today date := public.kidnova_tashkent_today();
begin
  perform 1 from public.kidnova_admin_scope('kidnova');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', k.id, 'code', k.code, 'name', k.name, 'city', k.city, 'status', k.status,
      'children', (select count(*) from public.demo_children c where c.kindergarten_id = k.id),
      'checked_in_today', (select count(*) from public.attendance_records a join public.demo_children c on c.id = a.child_id
                            where c.kindergarten_id = k.id and a.attendance_date = v_today),
      'screenings_7d', (select count(*) from public.attendance_records a join public.demo_children c on c.id = a.child_id
                         where c.kindergarten_id = k.id and a.attendance_date > v_today - 7),
      'alerts_pending', (select count(*) from public.screening_records s join public.demo_children c on c.id = s.child_id
                          where c.kindergarten_id = k.id and s.requires_staff_review and s.reviewed_at is null),
      'telegram_linked_children', (select count(distinct l.child_id) from public.telegram_links l join public.demo_children c on c.id = l.child_id
                                    where c.kindergarten_id = k.id),
      'robots_total', (select count(*) from public.robots r where r.kindergarten_id = k.id),
      'robots_online', (select count(*) from public.robots r where r.kindergarten_id = k.id and r.status = 'online'),
      'open_tickets', (select count(*) from public.service_tickets t where t.kindergarten_id = k.id and t.status <> 'resolved')
    ) order by k.code)
    from public.kindergartens k
  ), '[]'::jsonb);
end;
$$;

create or replace function public.kidnova_hq_service()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.kidnova_admin_scope('kidnova');
  return jsonb_build_object(
    'robots', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'serial', r.serial, 'kindergarten', k.name, 'status', r.status,
                 'last_seen_at', r.last_seen_at, 'last_calibrated_at', r.last_calibrated_at, 'firmware', r.firmware) order by r.serial)
               from public.robots r join public.kindergartens k on k.id = r.kindergarten_id), '[]'::jsonb),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'kindergarten', k.name, 'robot', r.serial, 'title', t.title,
                 'details', t.details, 'status', t.status, 'assigned_to', t.assigned_to, 'created_at', t.created_at, 'resolved_at', t.resolved_at)
                 order by (t.status = 'resolved'), t.created_at desc)
               from public.service_tickets t join public.kindergartens k on k.id = t.kindergarten_id
               left join public.robots r on r.id = t.robot_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.kidnova_hq_set_robot_status(p_robot uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_serial text;
begin
  perform 1 from public.kidnova_admin_scope('kidnova');
  if p_status not in ('online','offline','maintenance') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.robots r set status = p_status, last_seen_at = case when p_status = 'online' then now() else r.last_seen_at end
   where r.id = p_robot returning r.kindergarten_id, r.serial into v_kg, v_serial;
  if not found then raise exception 'robot_not_found' using errcode = '22023'; end if;
  perform public.kidnova_audit('kidnova_admin', v_kg, 'robot_status', jsonb_build_object('robot', v_serial, 'status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.kidnova_hq_update_ticket(p_ticket uuid, p_status text, p_assigned_to text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_kg uuid; v_title text;
begin
  perform 1 from public.kidnova_admin_scope('kidnova');
  if p_status not in ('open','in_progress','resolved') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if p_assigned_to is not null and char_length(p_assigned_to) > 60 then raise exception 'invalid_assignee' using errcode = '22023'; end if;
  update public.service_tickets t
     set status = p_status, assigned_to = nullif(btrim(coalesce(p_assigned_to, t.assigned_to, '')), ''), updated_at = now(),
         resolved_at = case when p_status = 'resolved' then coalesce(t.resolved_at, now()) else null end
   where t.id = p_ticket returning t.kindergarten_id, t.title into v_kg, v_title;
  if not found then raise exception 'ticket_not_found' using errcode = '22023'; end if;
  perform public.kidnova_audit('kidnova_admin', v_kg, 'ticket_updated', jsonb_build_object('title', v_title, 'status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.kidnova_hq_set_kindergarten_status(p_kg uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_name text;
begin
  perform 1 from public.kidnova_admin_scope('kidnova');
  if p_status not in ('pilot','active','paused') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.kindergartens k set status = p_status where k.id = p_kg returning k.name into v_name;
  if not found then raise exception 'kindergarten_not_found' using errcode = '22023'; end if;
  perform public.kidnova_audit('kidnova_admin', p_kg, 'kindergarten_status', jsonb_build_object('kindergarten', v_name, 'status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

-- ───────────────────────── 6. Grants ─────────────────────────
revoke all on function public.kidnova_admin_scope(text) from public, anon, authenticated;
revoke all on function public.kidnova_audit(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.kidnova_tashkent_today() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'kidnova_admin_whoami()', 'kidnova_admin_audit(integer)',
    'kidnova_kg_dashboard()', 'kidnova_kg_children()', 'kidnova_kg_child_history(uuid)', 'kidnova_kg_attendance(date, date)',
    'kidnova_kg_alerts()', 'kidnova_kg_review_alert(uuid)', 'kidnova_kg_add_child(text)', 'kidnova_kg_create_link_code(uuid, text)',
    'kidnova_kg_robots()', 'kidnova_kg_create_ticket(uuid, text, text)',
    'kidnova_hq_overview()', 'kidnova_hq_service()', 'kidnova_hq_set_robot_status(uuid, text)',
    'kidnova_hq_update_ticket(uuid, text, text)', 'kidnova_hq_set_kindergarten_status(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

commit;

-- ───────────────────────── 7. Assign admin roles (run after creating the 3 Auth users) ─────────────────────────
-- Replace the e-mails with the accounts you created in Authentication → Users.
-- insert into public.kidnova_demo_roles(user_id, role, child_id, kindergarten_id)
-- select u.id, 'kindergarten_admin', null, k.id from auth.users u cross join public.kindergartens k
--  where u.email = 'DIRECTOR1_EMAIL' and k.code = 'KG-01'
-- on conflict (user_id) do update set role = excluded.role, child_id = null, kindergarten_id = excluded.kindergarten_id;
-- insert into public.kidnova_demo_roles(user_id, role, child_id, kindergarten_id)
-- select u.id, 'kindergarten_admin', null, k.id from auth.users u cross join public.kindergartens k
--  where u.email = 'DIRECTOR2_EMAIL' and k.code = 'KG-02'
-- on conflict (user_id) do update set role = excluded.role, child_id = null, kindergarten_id = excluded.kindergarten_id;
-- insert into public.kidnova_demo_roles(user_id, role, child_id, kindergarten_id)
-- select u.id, 'kidnova_admin', null, null from auth.users u where u.email = 'TEAM_EMAIL'
-- on conflict (user_id) do update set role = excluded.role, child_id = null, kindergarten_id = null;
