import { loadDayData } from '$lib/habits/load-day';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user) {
		return { session, user, day: null };
	}

	const day = await loadDayData(supabase, user.id);
	return { session, user, day };
};
