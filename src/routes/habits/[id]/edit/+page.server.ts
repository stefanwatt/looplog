import { error } from '@sveltejs/kit';
import { getHabit } from '$lib/habits/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		error(401, 'Not signed in');
	}

	const habit = await getHabit(supabase, user.id, params.id);
	if (!habit) {
		error(404, 'Habit not found');
	}

	return { habit };
};
