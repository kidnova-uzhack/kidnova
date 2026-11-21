-- KidNova Telegram bridge, step 3: reusable demo codes (e.g. one code for all hackathon judges).
-- Run in Supabase SQL Editor AFTER telegram_multi_child.sql. Safe to run more than once.
-- Normal codes stay one-time / 24 h. A reusable code links any number of chats until it expires (max 90 days).
begin;

alter table public.telegram_link_codes add column if not exists reusable boolean not null default false;

-- Staff tool: reusable code for a demo wristband, valid p_days days (1..90).
create or replace function public.kidnova_create_telegram_reusable_code(p_wristband_code text, p_code_hash text,
                                                                        p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid;
  v_name text;
  v_expires timestamptz := now() + make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90));
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_code_hash' using errcode = '22023';
  end if;
  select c.id, c.display_name into v_child, v_name
    from public.demo_children c where c.wristband_code = p_wristband_code;
  if v_child is null then raise exception 'unknown_rfid' using errcode = '22023'; end if;
  insert into public.telegram_link_codes(code_hash, child_id, expires_at, reusable)
    values (p_code_hash, v_child, v_expires, true);
  return jsonb_build_object('ok', true, 'child_name', v_name,
                            'expires', to_char(timezone('Asia/Tashkent', v_expires), 'DD.MM.YYYY HH24:MI'));
end;
$$;

-- Parent: /link KOD. One-time codes are consumed; reusable codes stay valid until they expire.
create or replace function public.kidnova_redeem_telegram_code(p_code_hash text, p_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid;
  v_reusable boolean;
  v_name text;
  v_already boolean;
  v_count integer;
begin
  if p_chat_id is null or p_chat_id <= 0 then raise exception 'invalid_chat' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(p_chat_id);
  select c.child_id, c.reusable into v_child, v_reusable
    from public.telegram_link_codes c
   where c.code_hash = p_code_hash and c.expires_at > now() and (c.used_at is null or c.reusable);
  if v_child is null then return jsonb_build_object('ok', false); end if;
  v_already := exists(select 1 from public.telegram_links l where l.chat_id = p_chat_id and l.child_id = v_child);
  if not v_already
     and (select count(*) from public.telegram_links l where l.chat_id = p_chat_id) >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  if v_reusable then
    update public.telegram_link_codes set used_at = coalesce(used_at, now()) where code_hash = p_code_hash;
  else
    update public.telegram_link_codes set used_at = now() where code_hash = p_code_hash and used_at is null;
    if not found then return jsonb_build_object('ok', false); end if;
  end if;
  insert into public.telegram_links(chat_id, child_id, linked_at) values (p_chat_id, v_child, now())
    on conflict (chat_id, child_id) do nothing;
  select count(*) into v_count from public.telegram_links l where l.chat_id = p_chat_id;
  select c.display_name into v_name from public.demo_children c where c.id = v_child;
  return jsonb_build_object('ok', true, 'child_name', v_name, 'already', v_already, 'children', v_count);
end;
$$;

revoke all on function public.kidnova_create_telegram_reusable_code(text, text, integer) from public, anon, authenticated;
revoke all on function public.kidnova_redeem_telegram_code(text, bigint) from public, anon, authenticated;
grant execute on function public.kidnova_create_telegram_reusable_code(text, text, integer) to service_role;
grant execute on function public.kidnova_redeem_telegram_code(text, bigint) to service_role;

commit;
