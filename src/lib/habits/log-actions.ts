import { getDayStore } from '$lib/habits/day.svelte';
import type { Habit } from '$lib/database.types';
import { upsertLog } from '$lib/habits/service';
import { createClient } from '$lib/supabase/client';

export type HabitLogPayload = {
	actualValue?: number | null;
	actualTime?: string | null;
	satisfaction?: number | null;
};

export type LogActionOptions = {
	updateStore?: boolean;
};

async function getAuthenticatedClient() {
	const supabase = createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Not signed in');
	return { supabase, user };
}

export async function logHabit(
	habit: Habit,
	dateKey: string,
	payload: HabitLogPayload,
	options: LogActionOptions = {}
) {
	const { supabase, user } = await getAuthenticatedClient();
	const log = await upsertLog(supabase, user.id, habit, dateKey, {
		status: 'logged',
		actualValue: payload.actualValue,
		actualTime: payload.actualTime,
		satisfaction: payload.satisfaction
	});

	if (options.updateStore !== false) {
		getDayStore().applyLog(log);
	}

	return log;
}

export async function skipHabit(habit: Habit, dateKey: string, options: LogActionOptions = {}) {
	const { supabase, user } = await getAuthenticatedClient();
	const log = await upsertLog(supabase, user.id, habit, dateKey, { status: 'skipped' });

	if (options.updateStore !== false) {
		getDayStore().applyLog(log);
	}

	return log;
}

export async function resetHabitLog(
	habitId: string,
	dateKey: string,
	options: LogActionOptions = {}
) {
	const { supabase, user } = await getAuthenticatedClient();
	const { error } = await supabase
		.from('habit_logs')
		.delete()
		.eq('user_id', user.id)
		.eq('habit_id', habitId)
		.eq('log_date', dateKey);

	if (error) throw error;

	if (options.updateStore !== false) {
		getDayStore().removeLog(habitId, dateKey);
	}
}
