import { canSkipToday } from '$lib/habits/adherence';
import type { Habit, HabitLog, HabitWithLog } from '$lib/database.types';
import { dayViewsFromData, type LoadedDayData } from '$lib/habits/load-day';
import {
	buildTimedHabitStack,
	hasCatchUpHabits,
	listLogsForDates,
	recentLogsMapFromRecord
} from '$lib/habits/service';
import { dateKeyInTimezone, parseDateKey, shiftDateKey } from '$lib/habits/schedule';
import { createClient } from '$lib/supabase/client';

export type AnytimeHabit = HabitWithLog & { canSkip: boolean };

class DayStore {
	userId = $state<string | null>(null);
	timezone = $state('UTC');
	todayDateKey = $state('');
	viewDateKey = $state('');
	habits = $state.raw<Habit[]>([]);
	logs = $state.raw<HabitLog[]>([]);
	recentLogsByHabit = $state.raw<Map<string, HabitLog[]>>(new Map());
	loadedDateKeys = $state.raw<Set<string>>(new Set());
	ready = $state(false);

	init(userId: string, data: LoadedDayData) {
		this.userId = userId;
		this.timezone = data.timezone;
		this.todayDateKey = data.dateKey;
		this.viewDateKey = data.dateKey;
		this.habits = data.habits;
		this.logs = data.logs;
		this.recentLogsByHabit = recentLogsMapFromRecord(data.recentLogs);
		this.loadedDateKeys = new Set([data.dateKey]);
		this.ready = true;
	}

	reset() {
		this.userId = null;
		this.ready = false;
		this.habits = [];
		this.logs = [];
		this.recentLogsByHabit = new Map();
		this.loadedDateKeys = new Set();
	}

	logsForDate(dateKey: string): HabitLog[] {
		return this.logs.filter((log) => log.log_date === dateKey);
	}

	timedHabitsFor(dateKey: string): HabitWithLog[] {
		if (!this.ready || !dateKey) return [];

		return dayViewsFromData(
			{
				timezone: this.timezone,
				dateKey,
				habits: this.habits,
				logs: this.logs
			},
			dateKey
		).timedHabits;
	}

	anytimeHabitsFor(dateKey: string): AnytimeHabit[] {
		if (!this.ready || !dateKey) return [];

		const habits = dayViewsFromData(
			{
				timezone: this.timezone,
				dateKey,
				habits: this.habits,
				logs: this.logs
			},
			dateKey
		).anytimeHabits;

		return habits.map((habit) => ({
			...habit,
			canSkip: canSkipToday(
				habit,
				this.recentLogsByHabit.get(habit.id) ?? [],
				dateKey
			)
		}));
	}

	canSkipHabit(habit: HabitWithLog, dateKey: string): boolean {
		return canSkipToday(habit, this.recentLogsByHabit.get(habit.id) ?? [], dateKey);
	}

	nextStackFor(options: {
		dateKey?: string;
		focusHabitId?: string | null;
		catchUp?: boolean;
		now?: Date;
	}) {
		const dateKey = options.dateKey ?? this.todayDateKey;
		if (!this.ready || !dateKey) {
			return {
				upcomingHabits: [],
				doneCount: 0,
				timedCount: 0,
				catchUpAvailable: false,
				canSkip: false
			};
		}

		const timed = this.timedHabitsFor(dateKey);
		const now = options.now ?? new Date();
		const upcomingHabits = buildTimedHabitStack(timed, {
			timezone: this.timezone,
			focusHabitId: options.focusHabitId,
			catchUp: options.catchUp,
			now
		});
		const doneCount = timed.filter((habit) => habit.log).length;
		const catchUpAvailable =
			!options.catchUp && hasCatchUpHabits(timed, now, this.timezone);
		const currentHabit = upcomingHabits[0] ?? null;

		return {
			upcomingHabits,
			doneCount,
			timedCount: timed.length,
			catchUpAvailable,
			canSkip: currentHabit ? this.canSkipHabit(currentHabit, dateKey) : false
		};
	}

	applyLog(log: HabitLog) {
		this.logs = this.logs.filter(
			(existing) => !(existing.habit_id === log.habit_id && existing.log_date === log.log_date)
		);
		this.logs = [...this.logs, log];
		this.loadedDateKeys.add(log.log_date);

		if (log.log_date < this.todayDateKey) {
			const recent = [...(this.recentLogsByHabit.get(log.habit_id) ?? [])];
			const filtered = recent.filter((entry) => entry.log_date !== log.log_date);
			this.recentLogsByHabit = new Map(this.recentLogsByHabit).set(log.habit_id, [
				log,
				...filtered
			].slice(0, 14));
		}
	}

	removeLog(habitId: string, dateKey: string) {
		this.logs = this.logs.filter(
			(log) => !(log.habit_id === habitId && log.log_date === dateKey)
		);

		const recent = this.recentLogsByHabit.get(habitId) ?? [];
		const removed = recent.find((log) => log.log_date === dateKey);
		if (removed) {
			this.recentLogsByHabit = new Map(this.recentLogsByHabit).set(
				habitId,
				recent.filter((log) => log.log_date !== dateKey)
			);
		}
	}

	applyHabit(habit: Habit) {
		if (habit.archived_at) {
			this.removeHabit(habit.id);
			return;
		}

		const index = this.habits.findIndex((existing) => existing.id === habit.id);
		if (index === -1) {
			this.habits = [...this.habits, habit].sort((a, b) => {
				const timeCompare = (a.anchor_time ?? '').localeCompare(b.anchor_time ?? '');
				return timeCompare !== 0 ? timeCompare : a.name.localeCompare(b.name);
			});
			return;
		}

		this.habits = this.habits.map((existing) => (existing.id === habit.id ? habit : existing));
	}

	removeHabit(habitId: string) {
		this.habits = this.habits.filter((existing) => existing.id !== habitId);
	}

	async ensureDateLoaded(dateKey: string) {
		if (!this.userId || this.loadedDateKeys.has(dateKey)) return;

		const client = createClient();
		const logs = await listLogsForDates(client, this.userId, [dateKey]);
		const existing = new Set(this.logs.map((log) => `${log.habit_id}:${log.log_date}`));
		const merged = [...this.logs];

		for (const log of logs) {
			const key = `${log.habit_id}:${log.log_date}`;
			if (!existing.has(key)) {
				merged.push(log);
				existing.add(key);
			}
		}

		this.logs = merged;
		this.loadedDateKeys = new Set([...this.loadedDateKeys, dateKey]);
	}

	async refreshToday() {
		if (!this.userId) return;

		const client = createClient();
		const dateKey = dateKeyInTimezone(new Date(), this.timezone);
		const logs = await listLogsForDates(client, this.userId, [dateKey]);

		this.todayDateKey = dateKey;
		this.logs = [
			...this.logs.filter((log) => log.log_date !== dateKey),
			...logs
		];
		this.loadedDateKeys = new Set([...this.loadedDateKeys, dateKey]);
	}

	viewDateKeys() {
		return {
			prevDateKey: shiftDateKey(this.viewDateKey, -1),
			nextDateKey: shiftDateKey(this.viewDateKey, 1)
		};
	}

	setViewDateKey(dateKey: string) {
		this.viewDateKey = dateKey;
	}

	parseViewDate() {
		return parseDateKey(this.viewDateKey);
	}
}

let store: DayStore | null = null;

export function getDayStore() {
	if (!store) {
		store = new DayStore();
	}
	return store;
}
