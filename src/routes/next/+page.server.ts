import { canSkipToday } from '$lib/habits/adherence';
import { buildTimedHabitStack, listRecentLogs } from '$lib/habits/service';
import { loadDayContext } from '$lib/server/day';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return {
			upcomingHabits: [],
			canSkip: false,
			timezone: 'UTC',
			dateKey: '',
			timedCount: 0,
			doneCount: 0
		};
	}

	const focusHabitId = url.searchParams.get('habitId');
	const day = await loadDayContext(supabase, user.id, {
		dateKey: url.searchParams.get('date') ?? undefined
	});
	const timed = day.timedHabits;
	const upcomingHabits = buildTimedHabitStack(timed, {
		timezone: day.timezone,
		focusHabitId
	});
	const doneCount = timed.filter((habit) => habit.log).length;

	const currentHabit = upcomingHabits[0] ?? null;
	let canSkip = false;
	if (currentHabit) {
		const recentLogs = await listRecentLogs(supabase, currentHabit.id, day.dateKey);
		canSkip = canSkipToday(currentHabit, recentLogs, day.dateKey);
	}

	return {
		upcomingHabits,
		canSkip,
		timezone: day.timezone,
		dateKey: day.dateKey,
		timedCount: timed.length,
		doneCount
	};
};
