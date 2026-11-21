-- KidNova hosted demo schema. Run once in Supabase SQL Editor.
-- Synthetic children and readings only. No diagnosis or message delivery.
begin;

create table if not exists public.demo_children (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique check (display_name ~ '^Demo Child [A-Z]$'),
  wristband_code text not null unique check (wristband_code ~ '^SIM-RFID-[A-Z]$'),
  created_at timestamptz not null default now()
);

insert into public.demo_children(display_name,wristband_code)
values ('Demo Child A','SIM-RFID-A'),('Demo Child B','SIM-RFID-B'),('Demo Child C','SIM-RFID-C'),
       ('Demo Child D','SIM-RFID-D'),('Demo Child E','SIM-RFID-E'),('Demo Child F','SIM-RFID-F')
on conflict (wristband_code) do nothing;

create table if not exists public.kidnova_demo_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff','parent')),
  child_id uuid references public.demo_children(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint demo_role_child_scope check ((role = 'staff' and child_id is null) or (role = 'parent' and child_id is not null))
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.demo_children(id) on delete cascade,
  attendance_date date not null,
  identified_by text not null default 'simulated_rfid' check (identified_by = 'simulated_rfid'),
  created_at timestamptz not null default now(),
  constraint attendance_once_per_child_local_day unique(child_id, attendance_date),
  constraint attendance_id_child_unique unique(id, child_id)
);

create table if not exists public.screening_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.demo_children(id) on delete cascade,
  attendance_id uuid not null unique,
  temperature_c numeric(4,1) not null check (temperature_c between 34.0 and 42.0),
  height_cm integer not null check (height_cm between 70 and 160),
  weight_kg numeric(4,1) not null check (weight_kg between 5.0 and 60.0),
  measurement_source text not null default 'simulated_infrared' check (measurement_source = 'simulated_infrared'),
  requires_staff_review boolean not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint screening_matches_attendance_child foreign key(attendance_id, child_id) references public.attendance_records(id, child_id) on delete cascade,
  constraint screening_id_child_unique unique(id, child_id)
);

create table if not exists public.notification_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.demo_children(id) on delete cascade,
  screening_id uuid not null unique,
  channel text not null default 'telegram_preview' check (channel = 'telegram_preview'),
  delivery_status text not null default 'preview_only' check (delivery_status = 'preview_only'),
  message_preview text not null check (length(message_preview) <= 1000),
  created_at timestamptz not null default now(),
  constraint notification_matches_screening_child foreign key(screening_id, child_id) references public.screening_records(id, child_id) on delete cascade
);

alter table public.demo_children enable row level security;
alter table public.kidnova_demo_roles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.screening_records enable row level security;
alter table public.notification_records enable row level security;

drop policy if exists "demo roles visible to owner" on public.kidnova_demo_roles;
create policy "demo roles visible to owner" on public.kidnova_demo_roles for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "assigned demo children readable" on public.demo_children;
create policy "assigned demo children readable" on public.demo_children for select to authenticated using (
  exists (select 1 from public.kidnova_demo_roles r where r.user_id = (select auth.uid()) and (r.role = 'staff' or (r.role = 'parent' and r.child_id = demo_children.id)))
);
drop policy if exists "staff or assigned parent read attendance" on public.attendance_records;
create policy "staff or assigned parent read attendance" on public.attendance_records for select to authenticated using (
  exists (select 1 from public.kidnova_demo_roles r where r.user_id = (select auth.uid()) and (r.role = 'staff' or (r.role = 'parent' and r.child_id = attendance_records.child_id)))
);
drop policy if exists "staff or assigned parent read screenings" on public.screening_records;
create policy "staff or assigned parent read screenings" on public.screening_records for select to authenticated using (
  exists (select 1 from public.kidnova_demo_roles r where r.user_id = (select auth.uid()) and (r.role = 'staff' or (r.role = 'parent' and r.child_id = screening_records.child_id)))
);
drop policy if exists "staff or assigned parent read notification previews" on public.notification_records;
create policy "staff or assigned parent read notification previews" on public.notification_records for select to authenticated using (
  exists (select 1 from public.kidnova_demo_roles r where r.user_id = (select auth.uid()) and (r.role = 'staff' or (r.role = 'parent' and r.child_id = notification_records.child_id)))
);

revoke all on public.demo_children, public.kidnova_demo_roles, public.attendance_records, public.screening_records, public.notification_records from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.demo_children, public.kidnova_demo_roles, public.attendance_records, public.notification_records to authenticated;
grant select (id,child_id,attendance_id,temperature_c,height_cm,weight_kg,measurement_source,requires_staff_review,reviewed_at,created_at)
  on public.screening_records to authenticated;

create or replace function public.kidnova_demo_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_child uuid;
  v_children jsonb;
  v_events jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select r.role, r.child_id into v_role, v_child from public.kidnova_demo_roles r where r.user_id = v_user;
  if v_role is null then raise exception 'demo_role_not_assigned' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'display_name',c.display_name,'wristband_code',c.wristband_code) order by c.wristband_code),'[]'::jsonb)
    into v_children from public.demo_children c where v_role = 'staff' or c.id = v_child;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'screening_id',s.id,'child_name',c.display_name,'wristband_code',c.wristband_code,'attendance_date',a.attendance_date,
    'checked_in_at',a.created_at,'temperature_c',s.temperature_c,'height_cm',s.height_cm,'weight_kg',s.weight_kg,
    'requires_staff_review',s.requires_staff_review,'reviewed_at',s.reviewed_at,'notification_status',n.delivery_status,
    'notification_channel',n.channel,'message_preview',n.message_preview
  ) order by a.created_at desc),'[]'::jsonb)
    into v_events from public.attendance_records a
    join public.demo_children c on c.id = a.child_id
    join public.screening_records s on s.attendance_id = a.id and s.child_id = a.child_id
    join public.notification_records n on n.screening_id = s.id and n.child_id = s.child_id
    where v_role = 'staff' or a.child_id = v_child;
  return jsonb_build_object('role',v_role,'children',v_children,'events',v_events);
end;
$$;

create or replace function public.kidnova_review_demo_alert(p_screening_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_reviewed_at timestamptz;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select r.role into v_role from public.kidnova_demo_roles r where r.user_id = v_user;
  if v_role is distinct from 'staff' then raise exception 'staff_role_required' using errcode = '42501'; end if;
  update public.screening_records s
    set reviewed_at = coalesce(s.reviewed_at, pg_catalog.now()),
        reviewed_by = coalesce(s.reviewed_by, v_user)
    where s.id = p_screening_id and s.requires_staff_review
    returning s.reviewed_at into v_reviewed_at;
  if not found then raise exception 'reviewable_alert_not_found' using errcode = '22023'; end if;
  return jsonb_build_object('ok',true,'reviewed_at',v_reviewed_at,
    'note','Staff acknowledgement only. Not a medical assessment or diagnosis.');
end;
$$;

create or replace function public.kidnova_record_demo_checkin(p_rfid_code text, p_temperature_c numeric, p_height_cm integer, p_weight_kg numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_child uuid;
  v_attendance uuid;
  v_screening uuid;
  v_name text;
  v_local_date date;
  v_review boolean;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select r.role into v_role from public.kidnova_demo_roles r where r.user_id = v_user;
  if v_role is distinct from 'staff' then raise exception 'staff_role_required' using errcode = '42501'; end if;
  if p_temperature_c is null or p_temperature_c < 34.0 or p_temperature_c > 42.0 then raise exception 'invalid_simulated_temperature' using errcode = '22023'; end if;
  if p_height_cm is null or p_height_cm < 70 or p_height_cm > 160 or p_weight_kg is null or p_weight_kg < 5.0 or p_weight_kg > 60.0 then raise exception 'invalid_synthetic_measurements' using errcode = '22023'; end if;
  select c.id,c.display_name into v_child,v_name from public.demo_children c where c.wristband_code = p_rfid_code;
  if v_child is null then raise exception 'unknown_rfid' using errcode = '22023'; end if;
  v_local_date := timezone('Asia/Tashkent', now())::date;
  -- This is a synthetic workflow flag, not a clinical threshold or diagnosis.
  v_review := p_temperature_c >= 37.5 or p_temperature_c <= 35.0;
  insert into public.attendance_records(child_id,attendance_date) values(v_child,v_local_date)
    on conflict (child_id,attendance_date) do nothing returning id into v_attendance;
  if v_attendance is null then return jsonb_build_object('ok',false,'code','duplicate_checkin'); end if;
  insert into public.screening_records(child_id,attendance_id,temperature_c,height_cm,weight_kg,requires_staff_review)
    values(v_child,v_attendance,p_temperature_c,p_height_cm,p_weight_kg,v_review) returning id into v_screening;
  insert into public.notification_records(child_id,screening_id,message_preview)
    values(v_child,v_screening,format(
      'SIMULATION ONLY: %s attendance recorded. Synthetic infrared temperature: %s C. %s No Telegram message was sent.',
      v_name,
      p_temperature_c,
      case when v_review then 'Staff review is required.' else 'No demo staff-review flag was triggered.' end
    ));
  return jsonb_build_object('ok',true,'child_id',v_child,'child_name',v_name,'wristband_code',p_rfid_code,'attendance_id',v_attendance,
    'screening_id',v_screening,'temperature_c',p_temperature_c,'requires_staff_review',v_review,'notification_status','preview_only',
    'notification_preview',format(
      'SIMULATION ONLY: %s attendance recorded. Synthetic infrared temperature: %s C. %s No Telegram message was sent.',
      v_name,
      p_temperature_c,
      case when v_review then 'Staff review is required.' else 'No demo staff-review flag was triggered.' end
    ));
end;
$$;

create or replace function public.kidnova_reset_demo_day(p_rfid_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_child uuid;
  v_name text;
  v_local_date date;
  v_deleted integer := 0;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select r.role into v_role from public.kidnova_demo_roles r where r.user_id = v_user;
  if v_role is distinct from 'staff' then raise exception 'staff_role_required' using errcode = '42501'; end if;
  select c.id,c.display_name into v_child,v_name from public.demo_children c where c.wristband_code = p_rfid_code;
  if v_child is null then raise exception 'unknown_rfid' using errcode = '22023'; end if;
  v_local_date := pg_catalog.timezone('Asia/Tashkent', pg_catalog.now())::date;
  delete from public.attendance_records a where a.child_id = v_child and a.attendance_date = v_local_date;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object(
    'ok',true,
    'deleted',v_deleted > 0,
    'child_name',v_name,
    'wristband_code',p_rfid_code,
    'attendance_date',v_local_date,
    'note','Synthetic current-day demo data only. Dependent screening and notification preview rows were removed by cascade.'
  );
end;
$$;

revoke all on function public.kidnova_demo_state() from public, anon, authenticated;
revoke all on function public.kidnova_record_demo_checkin(text,numeric,integer,numeric) from public, anon, authenticated;
revoke all on function public.kidnova_review_demo_alert(uuid) from public, anon, authenticated;
revoke all on function public.kidnova_reset_demo_day(text) from public, anon, authenticated;
grant execute on function public.kidnova_demo_state() to authenticated;
grant execute on function public.kidnova_record_demo_checkin(text,numeric,integer,numeric) to authenticated;
grant execute on function public.kidnova_review_demo_alert(uuid) to authenticated;
grant execute on function public.kidnova_reset_demo_day(text) to authenticated;

commit;
