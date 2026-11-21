-- KidNova Telegram bridge, step 2: one parent chat can follow several demo children.
-- Run in Supabase SQL Editor AFTER telegram_bridge.sql. Safe to run more than once.
-- Before: a new /link replaced the chat's previous child. After: /link adds a child (max 10 per chat).
begin;

-- Deliveries no longer reference telegram_links(chat_id), because chat_id stops being unique there.
alter table public.telegram_deliveries drop constraint if exists telegram_deliveries_chat_id_fkey;

alter table public.telegram_links drop constraint if exists telegram_links_pkey;
alter table public.telegram_links add constraint telegram_links_pkey primary key (chat_id, child_id);

-- Parent: /link KOD. Atomically consumes the code and ADDS the child to this chat.
create or replace function public.kidnova_redeem_telegram_code(p_code_hash text, p_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid;
  v_name text;
  v_already boolean;
  v_count integer;
begin
  if p_chat_id is null or p_chat_id <= 0 then raise exception 'invalid_chat' using errcode = '22023'; end if;
  -- Serialize concurrent /link calls from the same chat so the 10-child limit holds.
  perform pg_advisory_xact_lock(p_chat_id);
  select c.child_id into v_child
    from public.telegram_link_codes c
   where c.code_hash = p_code_hash and c.used_at is null and c.expires_at > now();
  if v_child is null then return jsonb_build_object('ok', false); end if;
  v_already := exists(select 1 from public.telegram_links l where l.chat_id = p_chat_id and l.child_id = v_child);
  if not v_already
     and (select count(*) from public.telegram_links l where l.chat_id = p_chat_id) >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'limit');  -- code stays unused
  end if;
  update public.telegram_link_codes set used_at = now()
   where code_hash = p_code_hash and used_at is null;
  if not found then return jsonb_build_object('ok', false); end if;
  insert into public.telegram_links(chat_id, child_id, linked_at) values (p_chat_id, v_child, now())
    on conflict (chat_id, child_id) do nothing;  -- re-linking keeps the original linked_at
  select count(*) into v_count from public.telegram_links l where l.chat_id = p_chat_id;
  select c.display_name into v_name from public.demo_children c where c.id = v_child;
  return jsonb_build_object('ok', true, 'child_name', v_name, 'already', v_already, 'children', v_count);
end;
$$;

-- Parent: /unlink or data deletion. Removes every child from this chat and its delivery log.
create or replace function public.kidnova_telegram_unlink(p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  delete from public.telegram_links l where l.chat_id = p_chat_id;
  v_found := found;
  delete from public.telegram_deliveries d where d.chat_id = p_chat_id;
  return v_found;
end;
$$;

-- Parent: 📊 Tarix. Latest KidNova screenings for EACH child linked to this chat (p_limit per child).
create or replace function public.kidnova_telegram_history(p_chat_id bigint, p_limit integer default 10)
returns table(display_name text, local_time text, temperature_c numeric, height_cm integer,
              weight_kg numeric, requires_staff_review boolean, reviewed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.display_name, h.local_time, h.temperature_c, h.height_cm, h.weight_kg,
         h.requires_staff_review, h.reviewed
    from (
      select c.display_name, c.wristband_code, s.created_at,
             to_char(timezone('Asia/Tashkent', s.created_at), 'DD.MM.YYYY HH24:MI') as local_time,
             s.temperature_c, s.height_cm, s.weight_kg, s.requires_staff_review,
             s.reviewed_at is not null as reviewed,
             row_number() over (partition by s.child_id order by s.created_at desc) as n
        from public.telegram_links l
        join public.screening_records s on s.child_id = l.child_id
        join public.demo_children c on c.id = l.child_id
       where l.chat_id = p_chat_id
    ) h
   where h.n <= least(greatest(coalesce(p_limit, 10), 1), 20)
   order by h.wristband_code, h.created_at desc;
$$;

revoke all on function public.kidnova_redeem_telegram_code(text, bigint) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_unlink(bigint) from public, anon, authenticated;
revoke all on function public.kidnova_telegram_history(bigint, integer) from public, anon, authenticated;
grant execute on function public.kidnova_redeem_telegram_code(text, bigint) to service_role;
grant execute on function public.kidnova_telegram_unlink(bigint) to service_role;
grant execute on function public.kidnova_telegram_history(bigint, integer) to service_role;

commit;
