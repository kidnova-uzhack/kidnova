-- KidNova <-> Telegram bot bridge. Run ONCE in Supabase SQL Editor, AFTER the website's schema.sql.
-- Additive only: existing website tables, policies and RPCs are not changed.
-- Synthetic demo children only. Only the bot (server-side secret / service_role key) can use these
-- objects; the browser's publishable key gets no access.
begin;

-- One-time link codes. Only the SHA-256 hash of the code is stored.
create table if not exists public.telegram_link_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  child_id uuid not null references public.demo_children(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Which parent Telegram chat follows which demo child (one child per chat).
create table if not exists public.telegram_links (
  chat_id bigint primary key check (chat_id > 0),
  child_id uuid not null references public.demo_children(id) on delete cascade,
  linked_at timestamptz not null default now()
);

-- Bot delivery log. notification_records.delivery_status stays 'preview_only' for the website.
create table if not exists public.telegram_deliveries (
  notification_id uuid not null references public.notification_records(id) on delete cascade,
  chat_id bigint not null references public.telegram_links(chat_id) on delete cascade,
  status text not null check (status in ('preview','sent','failed')),
  attempts integer not null default 1,
  last_error text check (length(last_error) <= 100),
  updated_at timestamptz not null default now(),
  primary key (notification_id, chat_id)
);

alter table public.telegram_link_codes enable row level security;
alter table public.telegram_links enable row level security;
alter table public.telegram_deliveries enable row level security;
-- No policies on purpose: anon/authenticated (browser) can never read Telegram chat IDs.
revoke all on public.telegram_link_codes, public.telegram_links, public.telegram_deliveries
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.telegram_link_codes, public.telegram_links, public.telegram_deliveries to service_role;

-- Staff tool: store a new one-time code for a demo wristband.
create or replace function public.kidnova_create_telegram_link_code(p_wristband_code text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid;
  v_name text;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_code_hash' using errcode = '22023';
  end if;
  select c.id, c.display_name into v_child, v_name
    from public.demo_children c where c.wristband_code = p_wristband_code;
  if v_child is null then raise exception 'unknown_rfid' using errcode = '22023'; end if;
  insert into public.telegram_link_codes(code_hash, child_id) values (p_code_hash, v_child);
  return jsonb_build_object('ok', true, 'child_name', v_name);
end;
$$;

-- Parent: /link KOD. Atomically consumes the code and links the chat.
create or replace function public.kidnova_redeem_telegram_code(p_code_hash text, p_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid;
  v_name text;
begin
  if p_chat_id is null or p_chat_id <= 0 then raise exception 'invalid_chat' using errcode = '22023'; end if;
  update public.telegram_link_codes
     set used_at = now()
   where code_hash = p_code_hash and used_at is null and expires_at > now()
  returning child_id into v_child;
  if v_child is null then return jsonb_build_object('ok', false); end if;
  insert into public.telegram_links(chat_id, child_id, linked_at) values (p_chat_id, v_child, now())
    on conflict (chat_id) do update set child_id = excluded.child_id, linked_at = now();
  select c.display_name into v_name from public.demo_children c where c.id = v_child;
  return jsonb_build_object('ok', true, 'child_name', v_name);
end;
$$;

-- Parent: /unlink or data deletion.
create or replace function public.kidnova_telegram_unlink(p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.telegram_links l where l.chat_id = p_chat_id;
  return found;
end;
$$;

-- Bot worker: KidNova check-ins for linked chats that the bot has not handled yet.
-- Only check-ins made after the chat was linked; failed sends retry up to 5 times.
create or replace function public.kidnova_telegram_pending(p_limit integer default 20)
returns table(notification_id uuid, chat_id bigint, display_name text, local_time text,
              temperature_c numeric, height_cm integer, weight_kg numeric, requires_staff_review boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, l.chat_id, c.display_name,
         to_char(timezone('Asia/Tashkent', s.created_at), 'DD.MM.YYYY HH24:MI'),
         s.temperature_c, s.height_cm, s.weight_kg, s.requires_staff_review
    from public.notification_records n
    join public.screening_records s on s.id = n.screening_id
    join public.demo_children c on c.id = n.child_id
    join public.telegram_links l on l.child_id = n.child_id
    left join public.telegram_deliveries d on d.notification_id = n.id and d.chat_id = l.chat_id
   where n.created_at >= l.linked_at
     and (d.notification_id is null
          or (d.status = 'failed' and d.attempts < 5 and d.updated_at < now() - interval '1 minute'))
   order by n.created_at
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Bot worker: record what happened to one notification.
create or replace function public.kidnova_telegram_mark(p_notification_id uuid, p_chat_id bigint,
                                                        p_status text, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('preview','sent','failed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  insert into public.telegram_deliveries(notification_id, chat_id, status, attempts, last_error, updated_at)
    values (p_notification_id, p_chat_id, p_status, 1, left(p_error, 100), now())
  on conflict (notification_id, chat_id) do update
    set status = excluded.status,
        attempts = public.telegram_deliveries.attempts + 1,
        last_error = excluded.last_error,
        updated_at = now();
end;
$$;

-- Parent: 📊 Tarix. Latest KidNova screenings of the child linked to this chat only.
create or replace function public.kidnova_telegram_history(p_chat_id bigint, p_limit integer default 10)
returns table(display_name text, local_time text, temperature_c numeric, height_cm integer,
              weight_kg numeric, requires_staff_review boolean, reviewed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.display_name,
         to_char(timezone('Asia/Tashkent', s.created_at), 'DD.MM.YYYY HH24:MI'),
         s.temperature_c, s.height_cm, s.weight_kg, s.requires_staff_review, s.reviewed_at is not null
    from public.telegram_links l
    join public.screening_records s on s.child_id = l.child_id
    join public.demo_children c on c.id = l.child_id
   where l.chat_id = p_chat_id
   order by s.created_at desc
   limit least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

revoke all on function public.kidnova_create_telegram_link_code(text, text) from public, anon, authenticated;
revoke all on function public.kidnova_redeem_telegram_code(text, bigint) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_unlink(bigint) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_pending(integer) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_mark(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_history(bigint, integer) from public, anon, authenticated;
grant execute on function public.kidnova_create_telegram_link_code(text, text) to service_role;
grant execute on function public.kidnova_redeem_telegram_code(text, bigint) to service_role;
grant execute on function public.kidnova_telegram_unlink(bigint) to service_role;
grant execute on function public.kidnova_telegram_pending(integer) to service_role;
grant execute on function public.kidnova_telegram_mark(uuid, bigint, text, text) to service_role;
grant execute on function public.kidnova_telegram_history(bigint, integer) to service_role;

commit;
