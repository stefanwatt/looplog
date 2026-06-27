import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Habit, HabitLog, HabitType, HabitWithLog } from '$lib/database.types';
import { calculateAdherence } from '$lib/habits/adherence';
import { dateKeyInTimezone, isActiveOnDate } from '$lib/habits/schedule';
import { nowTimeString, parseTimeToMinutes } from '$lib/habits/adherence';

type Client = SupabaseClient<Database>;

export async function getProfile(client: Client, userId: string) {
	const { data, error } = await client.from('profiles').select('*').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return data;
}

export async function ensureTimezone(client: Client, userId: string, timezone: string) {
	let profile = await getProfile(client, userId);

	if (!profile) {
		const { data, error } = await client
			.from('profiles')
			.insert({ user_id: userId, timezone })
			.select('*')
			.single();
		if (error) throw error;
		return data;
	}
	if (profile.timezone === timezone) return profile;

	const { data, error } = await client
		.from('profiles')
		.update({ timezone })
		.eq('user_id', userId)
		.select('*')
		.single();

	if (error) throw error;
	return data;
}

export async function listActiveHabits(client: Client, userId: string) {
	const { data, error } = await client
		.from('habits')
		.select('*')
		.eq('user_id', userId)
		.is('archived_at', null)
		.order('anchor_time', { ascending: true, nullsFirst: false })
		.order('name', { ascending: true });

	if (error) throw error;
	return data;
}

export async function listLogsForDates(client: Client, userId: string, dateKeys: string[]) {
	if (dateKeys.length === 0) return [] as HabitLog[];

	const { data, error } = await client
		.from('habit_logs')
		.select('*')
		.eq('user_id', userId)
		.in('log_date', dateKeys)
		.order('log_date', { ascending: false });

	if (error) throw error;
	return data;
}

export async function listRecentLogs(client: Client, habitId: string, beforeDateKey: string, limit = 14) {
	const { data, error } = await client
		.from('habit_logs')
		.select('*')
		.eq('habit_id', habitId)
		.lt('log_date', beforeDateKey)
		.order('log_date', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data;
}

export function attachLogs(habits: Habit[], logs: HabitLog[], dateKey: string): HabitWithLog[] {
	const byHabit = new Map(logs.filter((log) => log.log_date === dateKey).map((log) => [log.habit_id, log]));

	return habits.map((habit) => ({
		...habit,
		log: byHabit.get(habit.id) ?? null
	}));
}

export function habitsForDay(
	habits: Habit[],
	logs: HabitLog[],
	date: Date,
	timezone: string,
	options: { timed?: boolean; anytime?: boolean } = {}
): HabitWithLog[] {
	const dateKey = dateKeyInTimezone(date, timezone);

	return attachLogs(habits, logs, dateKey)
		.filter((habit) => isActiveOnDate(habit.active_days, date, timezone))
		.filter((habit) => {
			const hasTime = habit.anchor_time != null;
			if (options.timed) return hasTime;
			if (options.anytime) return !hasTime;
			return true;
		});
}

export function pendingTimedHabits(habits: HabitWithLog[]): HabitWithLog[] {
	return habits
		.filter((habit) => habit.anchor_time != null && !habit.log)
		.sort((a, b) => (a.anchor_time ?? '').localeCompare(b.anchor_time ?? ''));
}

export function nextPendingHabit(habits: HabitWithLog[], now = new Date(), timezone: string) {
	const pending = pendingTimedHabits(habits);
	if (pending.length === 0) return null;

	const nowMinutes = parseTimeToMinutes(nowTimeString(now, timezone));

	pending.sort((a, b) => {
		const aMinutes = parseTimeToMinutes(a.anchor_time ?? '00:00');
		const bMinutes = parseTimeToMinutes(b.anchor_time ?? '00:00');
		const aPastDue = aMinutes <= nowMinutes;
		const bPastDue = bMinutes <= nowMinutes;

		if (aPastDue !== bPastDue) return aPastDue ? -1 : 1;
		if (aPastDue && bPastDue) return aMinutes - bMinutes;
		return aMinutes - bMinutes;
	});

	return pending[0] ?? null;
}

export async function createHabit(
	client: Client,
	userId: string,
	habit: Omit<Database['public']['Tables']['habits']['Insert'], 'user_id'>
) {
	const { data, error } = await client
		.from('habits')
		.insert({ ...habit, user_id: userId })
		.select('*')
		.single();

	if (error) throw error;
	return data;
}

export async function upsertLog(
	client: Client,
	userId: string,
	habit: Habit,
	dateKey: string,
	payload:
		| { status: 'skipped' }
		| {
				status: 'logged';
				actualValue?: number | null;
				actualTime?: string | null;
				satisfaction?: number | null;
		  }
) {
	const base = {
		habit_id: habit.id,
		user_id: userId,
		log_date: dateKey,
		status: payload.status,
		actual_value: null,
		actual_time: null,
		satisfaction: null,
		adherence_score: null
	};

	if (payload.status === 'skipped') {
		const { data, error } = await client
			.from('habit_logs')
			.upsert(base, { onConflict: 'habit_id,log_date' })
			.select('*')
			.single();
		if (error) throw error;
		return data;
	}

	const adherence_score = calculateAdherence(habit, payload);

	const { data, error } = await client
		.from('habit_logs')
		.upsert(
			{
				...base,
				actual_value: payload.actualValue ?? null,
				actual_time: payload.actualTime ?? null,
				satisfaction: payload.satisfaction ?? null,
				adherence_score
			},
			{ onConflict: 'habit_id,log_date' }
		)
		.select('*')
		.single();

	if (error) throw error;
	return data;
}

export function habitTypeLabel(type: HabitType): string {
	switch (type) {
		case 'do_target':
			return 'Do (target)';
		case 'do_on_time':
			return 'Do (on time)';
		case 'avoid':
			return 'Avoid';
		case 'rate':
			return 'Rate';
	}
}

export function statusLabel(log: HabitLog | null): string {
	if (!log) return 'Pending';
	if (log.status === 'skipped') return 'Skipped';
	return `${log.adherence_score}%`;
}
