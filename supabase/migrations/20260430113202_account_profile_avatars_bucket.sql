-- Story 18.9 / FE.18.8 — public bucket for account portal member avatars; RLS scoped to auth.uid() folder prefix.

insert into storage.buckets (id, name, public)
values ('account_profile_avatars', 'account_profile_avatars', true)
on conflict (id) do nothing;

-- Authenticated users read all objects in bucket (public URLs already expose content; RLS still applies to API).
drop policy if exists account_profile_avatars_select_authenticated on storage.objects;
create policy account_profile_avatars_select_authenticated on storage.objects
	for select
	to authenticated
	using (bucket_id = 'account_profile_avatars');

drop policy if exists account_profile_avatars_insert_own on storage.objects;
create policy account_profile_avatars_insert_own on storage.objects
	for insert
	to authenticated
	with check (
		bucket_id = 'account_profile_avatars'
		and split_part(name, '/', 1) = auth.uid()::text
	);

drop policy if exists account_profile_avatars_update_own on storage.objects;
create policy account_profile_avatars_update_own on storage.objects
	for update
	to authenticated
	using (
		bucket_id = 'account_profile_avatars'
		and split_part(name, '/', 1) = auth.uid()::text
	)
	with check (
		bucket_id = 'account_profile_avatars'
		and split_part(name, '/', 1) = auth.uid()::text
	);

drop policy if exists account_profile_avatars_delete_own on storage.objects;
create policy account_profile_avatars_delete_own on storage.objects
	for delete
	to authenticated
	using (
		bucket_id = 'account_profile_avatars'
		and split_part(name, '/', 1) = auth.uid()::text
	);

comment on column public.profiles.avatar_url is
	'Optional public URL for member avatar; account portal uploads to storage bucket account_profile_avatars when enabled.';
