import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import {
	ensureTimezone,
	habitsForDay,
	listActiveHabits,
	listLogsForDates,
	nextPendingHabit
} from '$lib/habits/service';
import { dateKeyInTimezone, parseDateKey } from '$lib/habits/schedule';

type Client = SupabaseClient<Database>;

export async function loadDayContext(
	client: Client,
	userId: string,
	options: { dateKey?: string; browserTimezone?: string } = {}
) {
	const browserTimezone =
		options.browserTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
	const profile = await ensureTimezone(client, userId, browserTimezone);
	const timezone = profile.timezone;
	const dateKey = options.dateKey ?? dateKeyInTimezone(new Date(), timezone);
	const date = parseDateKey(dateKey);

	const habits = await listActiveHabits(client, userId);
	const logs = await listLogsForDates(client, userId, [dateKey]);

	return {
		timezone,
		dateKey,
		date,
		habits,
		logs,
		timedHabits: habitsForDay(habits, logs, date, timezone, { timed: true }),
		anytimeHabits: habitsForDay(habits, logs, date, timezone, { anytime: true }),
		allHabits: habitsForDay(habits, logs, date, timezone),
		nextHabit: nextPendingHabit(
			habitsForDay(habits, logs, date, timezone, { timed: true }),
			new Date(),
			timezone
		)
	};
}

export type DayContext = Awaited<ReturnType<typeof loadDayContext>>;
