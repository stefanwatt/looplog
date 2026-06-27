import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, HabitLog } from '$lib/database.types';
import {
	ensureTimezone,
	habitsForDay,
	listActiveHabits,
	listLogsForDates,
	listRecentLogsForHabits,
	recentLogsMapToRecord
} from '$lib/habits/service';
import { dateKeyInTimezone, parseDateKey } from '$lib/habits/schedule';

type Client = SupabaseClient<Database>;

export type LoadedDayData = {
	timezone: string;
	dateKey: string;
	habits: Awaited<ReturnType<typeof listActiveHabits>>;
	logs: HabitLog[];
	recentLogs: Record<string, HabitLog[]>;
};

export async function loadDayData(
	client: Client,
	userId: string,
	options: { dateKey?: string; browserTimezone?: string } = {}
): Promise<LoadedDayData> {
	const browserTimezone =
		options.browserTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
	const profile = await ensureTimezone(client, userId, browserTimezone);
	const timezone = profile.timezone;
	const dateKey = options.dateKey ?? dateKeyInTimezone(new Date(), timezone);

	const habits = await listActiveHabits(client, userId);
	const logs = await listLogsForDates(client, userId, [dateKey]);
	const recentLogsByHabit = await listRecentLogsForHabits(
		client,
		userId,
		habits.map((habit) => habit.id),
		dateKey
	);

	return {
		timezone,
		dateKey,
		habits,
		logs,
		recentLogs: recentLogsMapToRecord(recentLogsByHabit)
	};
}

export function dayViewsFromData(
	data: Pick<LoadedDayData, 'timezone' | 'dateKey' | 'habits' | 'logs'>,
	dateKey = data.dateKey
) {
	const date = parseDateKey(dateKey);
	const timedHabits = habitsForDay(data.habits, data.logs, date, data.timezone, { timed: true });
	const anytimeHabits = habitsForDay(data.habits, data.logs, date, data.timezone, {
		anytime: true
	});

	return { date, timedHabits, anytimeHabits };
}
