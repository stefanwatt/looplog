import { canSkipToday } from '$lib/habits/adherence';
import { listRecentLogs, orderedPendingTimedHabits } from '$lib/habits/service';
import { loadDayContext } from '$lib/server/day';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return {
			nextHabit: null,
			upcomingHabits: [],
			canSkip: false,
			timezone: 'UTC',
			dateKey: '',
			timedCount: 0,
			doneCount: 0
		};
	}

	const day = await loadDayContext(supabase, user.id);
	const timed = day.timedHabits;
	const upcomingHabits = orderedPendingTimedHabits(timed, new Date(), day.timezone).slice(0, 3);
	const doneCount = timed.filter((habit) => habit.log).length;

	let canSkip = false;
	if (day.nextHabit) {
		const recentLogs = await listRecentLogs(supabase, day.nextHabit.id, day.dateKey);
		canSkip = canSkipToday(day.nextHabit, recentLogs, day.dateKey);
	}

	return {
		nextHabit: day.nextHabit,
		upcomingHabits,
		canSkip,
		timezone: day.timezone,
		dateKey: day.dateKey,
		timedCount: timed.length,
		doneCount
	};
};
