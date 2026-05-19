-- Ops fleet drivers: CSS object-position for circular avatar framing (staff-adjustable).

alter table public.profiles
	add column if not exists avatar_object_position text;

update public.profiles
set avatar_object_position = 'center'
where avatar_object_position is null;

alter table public.profiles
	alter column avatar_object_position set default 'center';

alter table public.profiles
	alter column avatar_object_position set not null;

alter table public.profiles
	drop constraint if exists profiles_avatar_object_position_check;

alter table public.profiles
	add constraint profiles_avatar_object_position_check check (
		avatar_object_position in (
			'center',
			'top',
			'bottom',
			'left',
			'right',
			'top left',
			'top right',
			'bottom left',
			'bottom right'
		)
	);

comment on column public.profiles.avatar_object_position is
	'CSS object-position for profiles.avatar_url when shown as cover (ops driver list + detail).';
