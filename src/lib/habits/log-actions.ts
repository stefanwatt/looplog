import { invalidateAll } from '$app/navigation';
import type { Habit } from '$lib/database.types';
import { upsertLog } from '$lib/habits/service';
import { createClient } from '$lib/supabase/client';

export type HabitLogPayload = {
	actualValue?: number | null;
	actualTime?: string | null;
	satisfaction?: number | null;
};

async function getAuthenticatedClient() {
	const supabase = createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not signed in');
	return { supabase, user };
}

export async function logHabit(habit: Habit, dateKey: string, payload: HabitLogPayload) {
	const { supabase, user } = await getAuthenticatedClient();
	await upsertLog(supabase, user.id, habit, dateKey, {
		status: 'logged',
		actualValue: payload.actualValue,
		actualTime: payload.actualTime,
		satisfaction: payload.satisfaction
	});
	await invalidateAll();
}

export async function skipHabit(habit: Habit, dateKey: string) {
	const { supabase, user } = await getAuthenticatedClient();
	await upsertLog(supabase, user.id, habit, dateKey, { status: 'skipped' });
	await invalidateAll();
}

export async function resetHabitLog(habitId: string, dateKey: string) {
	const { supabase, user } = await getAuthenticatedClient();
	const { error } = await supabase
		.from('habit_logs')
		.delete()
		.eq('user_id', user.id)
		.eq('habit_id', habitId)
		.eq('log_date', dateKey);

	if (error) throw error;
	await invalidateAll();
}
