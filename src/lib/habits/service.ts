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

const RELEVANCE_GRACE_MINUTES = 30;

function anchorMinutes(habit: HabitWithLog): number {
	return parseTimeToMinutes(habit.anchor_time ?? '00:00');
}

function isRelevantPendingHabit(
	habitMinutes: number,
	nowMinutes: number,
	pendingAnchorMinutes: number[]
): boolean {
	if (habitMinutes > nowMinutes) return true;

	const minutesPast = nowMinutes - habitMinutes;
	if (minutesPast > RELEVANCE_GRACE_MINUTES) return false;

	const laterHabitStarted = pendingAnchorMinutes.some(
		(minutes) => minutes > habitMinutes && minutes <= nowMinutes
	);
	return !laterHabitStarted;
}

export function orderedPendingTimedHabits(
	habits: HabitWithLog[],
	now = new Date(),
	timezone: string
): HabitWithLog[] {
	const pending = pendingTimedHabits(habits);
	if (pending.length === 0) return [];

	const nowMinutes = parseTimeToMinutes(nowTimeString(now, timezone));
	const pendingMinutes = pending.map(anchorMinutes);

	const eligible = pending.filter((habit) =>
		isRelevantPendingHabit(anchorMinutes(habit), nowMinutes, pendingMinutes)
	);

	eligible.sort((a, b) => {
		const aMinutes = anchorMinutes(a);
		const bMinutes = anchorMinutes(b);
		const aDelta = Math.abs(aMinutes - nowMinutes);
		const bDelta = Math.abs(bMinutes - nowMinutes);

		if (aDelta !== bDelta) return aDelta - bDelta;

		const aPast = aMinutes <= nowMinutes;
		const bPast = bMinutes <= nowMinutes;
		if (aPast !== bPast) return aPast ? -1 : 1;

		return aMinutes - bMinutes;
	});

	return eligible;
}

export function nextPendingHabit(habits: HabitWithLog[], now = new Date(), timezone: string) {
	return orderedPendingTimedHabits(habits, now, timezone)[0] ?? null;
}

export function buildTimedHabitStack(
	habits: HabitWithLog[],
	options: {
		now?: Date;
		timezone: string;
		focusHabitId?: string | null;
		limit?: number;
	}
): HabitWithLog[] {
	const { now = new Date(), timezone, focusHabitId, limit = 3 } = options;
	const ordered = orderedPendingTimedHabits(habits, now, timezone);

	if (!focusHabitId) {
		return ordered.slice(0, limit);
	}

	const focused = habits.find(
		(habit) => habit.id === focusHabitId && habit.anchor_time != null
	);
	if (!focused) {
		return ordered.slice(0, limit);
	}

	const rest = ordered.filter((habit) => habit.id !== focused.id);
	return [focused, ...rest].slice(0, limit);
}

export async function getHabit(client: Client, userId: string, habitId: string) {
	const { data, error } = await client
		.from('habits')
		.select('*')
		.eq('user_id', userId)
		.eq('id', habitId)
		.is('archived_at', null)
		.maybeSingle();

	if (error) throw error;
	return data;
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

export async function updateHabit(
	client: Client,
	userId: string,
	habitId: string,
	updates: Database['public']['Tables']['habits']['Update']
) {
	const { data, error } = await client
		.from('habits')
		.update(updates)
		.eq('user_id', userId)
		.eq('id', habitId)
		.is('archived_at', null)
		.select('*')
		.single();

	if (error) throw error;
	return data;
}

export async function archiveHabit(client: Client, userId: string, habitId: string) {
	const { data, error } = await client
		.from('habits')
		.update({ archived_at: new Date().toISOString() })
		.eq('user_id', userId)
		.eq('id', habitId)
		.is('archived_at', null)
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
		case 'do_binary':
			return 'Do (binary)';
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
