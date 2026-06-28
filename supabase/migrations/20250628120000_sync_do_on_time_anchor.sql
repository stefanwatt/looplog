-- do_on_time habits use target time for focus ordering; keep existing rows in sync.
update public.habits
set anchor_time = target_time
where type = 'do_on_time'
	and target_time is not null
	and anchor_time is distinct from target_time;
