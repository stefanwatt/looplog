-- Allow zero-star satisfaction for rate and avoid habits

alter table public.habit_logs
	drop constraint if exists habit_logs_satisfaction_range;

alter table public.habit_logs
	add constraint habit_logs_satisfaction_range
	check (satisfaction is null or satisfaction between 0 and 5);

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
	elsif habit_type = 'do_binary' then
		if new.actual_value is null or new.actual_value not in (0, 1) then
			raise exception 'do_binary logs require actual_value of 0 or 1';
		end if;

		if new.actual_time is not null or new.satisfaction is not null then
			raise exception 'do_binary logs cannot include actual_time or satisfaction';
		end if;
	elsif habit_type = 'do_on_time' then
		if new.actual_time is null then
			raise exception 'do_on_time logs require actual_time';
		end if;

		if new.actual_value is not null or new.satisfaction is not null then
			raise exception 'do_on_time logs cannot include actual_value or satisfaction';
		end if;
	elsif habit_type in ('avoid', 'rate') then
		if new.satisfaction is null or new.satisfaction < 0 or new.satisfaction > 5 then
			raise exception 'avoid and rate logs require satisfaction between 0 and 5';
		end if;

		if new.actual_value is not null or new.actual_time is not null then
			raise exception 'avoid and rate logs cannot include actual_value or actual_time';
		end if;
	end if;

	return new;
end;
$$;
