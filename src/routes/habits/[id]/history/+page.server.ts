import { error } from '@sveltejs/kit';
import { ensureTimezone, getHabit, listLogsForHabit } from '$lib/habits/service';
import { dateKeyInTimezone } from '$lib/habits/schedule';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	locals: { supabase, safeGetSession }
}) => {
	const { user } = await safeGetSession();
	if (!user) {
		error(401, 'Not signed in');
	}

	const habit = await getHabit(supabase, user.id, params.id);
	if (!habit) {
		error(404, 'Habit not found');
	}

	const profile = await ensureTimezone(
		supabase,
		user.id,
		Intl.DateTimeFormat().resolvedOptions().timeZone
	);
	const timezone = profile.timezone;
	const todayDateKey = dateKeyInTimezone(new Date(), timezone);
	const logs = await listLogsForHabit(supabase, user.id, habit.id);

	return { habit, logs, timezone, todayDateKey };
};
