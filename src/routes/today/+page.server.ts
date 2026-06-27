import { loadDayContext } from '$lib/server/day';
import { shiftDateKey } from '$lib/habits/schedule';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return {
			timedHabits: [],
			timezone: 'UTC',
			dateKey: '',
			prevDateKey: '',
			nextDateKey: ''
		};
	}

	const day = await loadDayContext(supabase, user.id, {
		dateKey: url.searchParams.get('date') ?? undefined
	});

	return {
		timedHabits: day.timedHabits,
		timezone: day.timezone,
		dateKey: day.dateKey,
		prevDateKey: shiftDateKey(day.dateKey, -1),
		nextDateKey: shiftDateKey(day.dateKey, 1)
	};
};
