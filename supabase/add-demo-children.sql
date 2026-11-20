-- KidNova: add four more fictional demo children (C–F) to an existing hosted demo.
-- Run once in Supabase → SQL Editor on the KidNova project. Safe to run again.
-- Synthetic profiles only. Does not touch Auth users, roles or existing records.
begin;

-- The original schema only allowed Demo Child A/B. Replace those checks with pattern checks.
alter table public.demo_children drop constraint if exists demo_children_display_name_check;
alter table public.demo_children drop constraint if exists demo_children_wristband_code_check;
alter table public.demo_children add constraint demo_children_display_name_check
  check (display_name ~ '^Demo Child [A-Z]$');
alter table public.demo_children add constraint demo_children_wristband_code_check
  check (wristband_code ~ '^SIM-RFID-[A-Z]$');

insert into public.demo_children(display_name, wristband_code) values
  ('Demo Child C','SIM-RFID-C'),
  ('Demo Child D','SIM-RFID-D'),
  ('Demo Child E','SIM-RFID-E'),
  ('Demo Child F','SIM-RFID-F')
on conflict (wristband_code) do nothing;

commit;

-- Check: should list six children, A–F.
select display_name, wristband_code from public.demo_children order by wristband_code;
