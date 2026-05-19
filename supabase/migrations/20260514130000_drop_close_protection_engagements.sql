-- Retire legacy VST-11 engagements table (product surface removed).

drop table if exists public.close_protection_engagements cascade;
