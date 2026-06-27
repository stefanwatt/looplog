-- Looplog initial schema

create type public.habit_type as enum (
	'do_target',
	'do_on_time',
	'avoid',
	'rate'
);

create type public.log_status as enum (
	'logged',
	'skipped'
);

create table public.profiles (
	user_id uuid primary key references auth.users (id) on delete cascade,
	timezone text not null default 'UTC',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.habits (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	type public.habit_type not null,
	active_days smallint[] not null,
	allow_skip boolean not null default false,
	max_consecutive_skips smallint not null default 3,
	anchor_time time,
	target_value numeric,
	target_unit text,
	target_time time,
	grace_minutes smallint not null default 5,
	falloff_minutes_per_10_percent smallint not null default 6,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint habits_name_not_empty check (char_length(trim(name)) > 0),
	constraint habits_active_days_not_empty check (
		array_length(active_days, 1) is not null
		and array_length(active_days, 1) > 0
	),
	constraint habits_active_days_valid check (
		active_days <@ array [0, 1, 2, 3, 4, 5, 6]::smallint[]
	),
	constraint habits_max_consecutive_skips_positive check (max_consecutive_skips > 0),
	constraint habits_grace_minutes_non_negative check (grace_minutes >= 0),
	constraint habits_falloff_minutes_positive check (falloff_minutes_per_10_percent > 0),
	constraint habits_do_target_requires_target check (
		type <> 'do_target'
		or (
			target_value is not null
			and target_value > 0
			and target_unit is not null
			and char_length(trim(target_unit)) > 0
		)
	),
	constraint habits_do_on_time_requires_target_time check (
		type <> 'do_on_time'
		or target_time is not null
	),
	constraint habits_do_target_fields_only_for_do_target check (
		type = 'do_target'
		or (
			target_value is null
			and target_unit is null
		)
	),
	constraint habits_do_on_time_fields_only_for_do_on_time check (
		type = 'do_on_time'
		or target_time is null
	)
);

create table public.habit_logs (
	id uuid primary key default gen_random_uuid(),
	habit_id uuid not null references public.habits (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	log_date date not null,
	status public.log_status not null,
	actual_value numeric,
	actual_time time,
	satisfaction smallint,
	adherence_score smallint,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint habit_logs_one_per_day unique (habit_id, log_date),
	constraint habit_logs_satisfaction_range check (
		satisfaction is null
		or satisfaction between 1 and 5
	),
	constraint habit_logs_adherence_score_range check (
		adherence_score is null
		or adherence_score between 0 and 100
	),
	constraint habit_logs_logged_requires_score check (
		status = 'skipped'
		or adherence_score is not null
	),
	constraint habit_logs_skipped_has_no_payload check (
		status = 'logged'
		or (
			actual_value is null
			and actual_time is null
			and satisfaction is null
			and adherence_score is null
		)
	)
);

create index habits_user_id_active_idx on public.habits (user_id)
where
	archived_at is null;

create index habits_user_id_anchor_time_idx on public.habits (user_id, anchor_time)
where
	archived_at is null
	and anchor_time is not null;

create index habit_logs_habit_id_log_date_idx on public.habit_logs (habit_id, log_date desc);

create index habit_logs_user_id_log_date_idx on public.habit_logs (user_id, log_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger habits_set_updated_at
before update on public.habits
for each row
execute function public.set_updated_at();

create trigger habit_logs_set_updated_at
before update on public.habit_logs
for each row
execute function public.set_updated_at();

create or replace function public.validate_habit_log_payload()
returns trigger
language plpgsql
as $$
declare
	habit_type public.habit_type;
begin
	select h.type
	into habit_type
	from public.habits h
	where h.id = new.habit_id;

	if habit_type is null then
		raise exception 'habit not found for habit_log';
	end if;

	if new.status = 'skipped' then
		return new;
	end if;

	if habit_type = 'do_target' then
		if new.actual_value is null or new.actual_value < 0 then
			raise exception 'do_target logs require actual_value >= 0';
		end if;

		if new.actual_time is not null or new.satisfaction is not null then
			raise exception 'do_target logs cannot include actual_time or satisfaction';
		end if;
	elsif habit_type = 'do_on_time' then
		if new.actual_time is null then
			raise exception 'do_on_time logs require actual_time';
		end if;

		if new.actual_value is not null or new.satisfaction is not null then
			raise exception 'do_on_time logs cannot include actual_value or satisfaction';
		end if;
	elsif habit_type in ('avoid', 'rate') then
		if new.satisfaction is null then
			raise exception 'avoid and rate logs require satisfaction';
		end if;

		if new.actual_value is not null or new.actual_time is not null then
			raise exception 'avoid and rate logs cannot include actual_value or actual_time';
		end if;
	end if;

	return new;
end;
$$;

create trigger habit_logs_validate_payload
before insert or update on public.habit_logs
for each row
execute function public.validate_habit_log_payload();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (user_id)
	values (new.id);

	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can view their own habits"
on public.habits
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own habits"
on public.habits
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own habits"
on public.habits
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own habits"
on public.habits
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can view their own habit logs"
on public.habit_logs
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own habit logs"
on public.habit_logs
for insert
to authenticated
with check (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.habits h
		where
			h.id = habit_id
			and h.user_id = (select auth.uid())
	)
);

create policy "Users can update their own habit logs"
on public.habit_logs
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
	user_id = (select auth.uid())
	and exists (
		select 1
		from public.habits h
		where
			h.id = habit_id
			and h.user_id = (select auth.uid())
	)
);

create policy "Users can delete their own habit logs"
on public.habit_logs
for delete
to authenticated
using (user_id = (select auth.uid()));
