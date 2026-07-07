import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Habit, HabitLog } from '$lib/database.types';
import { ensureTimezone, listActiveHabits } from '$lib/habits/service';
import { dateKeyInTimezone } from '$lib/habits/schedule';

type Client = SupabaseClient<Database>;

export type LoadedStatsData = {
	timezone: string;
	todayDateKey: string;
	habits: Habit[];
	logs: HabitLog[];
};

export async function listAllLogs(client: Client, userId: string) {
	const { data, error } = await client
		.from('habit_logs')
		.select('*')
		.eq('user_id', userId)
		.order('log_date', { ascending: true });

	if (error) throw error;
	return data;
}

export async function loadStatsData(
	client: Client,
	userId: string,
	browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<LoadedStatsData> {
	const profile = await ensureTimezone(client, userId, browserTimezone);
	const timezone = profile.timezone;
	const todayDateKey = dateKeyInTimezone(new Date(), timezone);
	const [habits, logs] = await Promise.all([
		listActiveHabits(client, userId),
		listAllLogs(client, userId)
	]);

	return { timezone, todayDateKey, habits, logs };
}
