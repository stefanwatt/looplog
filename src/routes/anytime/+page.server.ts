import { canSkipToday } from '$lib/habits/adherence';
import { listRecentLogs } from '$lib/habits/service';
import { loadDayContext } from '$lib/server/day';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { anytimeHabits: [], timezone: 'UTC', dateKey: '' };

	const day = await loadDayContext(supabase, user.id);

	const anytimeHabits = await Promise.all(
		day.anytimeHabits.map(async (habit) => {
			const recentLogs = await listRecentLogs(supabase, habit.id, day.dateKey);
			return {
				...habit,
				canSkip: canSkipToday(habit, recentLogs, day.dateKey)
			};
		})
	);

	return {
		anytimeHabits,
		timezone: day.timezone,
		dateKey: day.dateKey
	};
};
