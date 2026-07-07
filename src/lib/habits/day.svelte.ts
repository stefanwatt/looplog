import { canSkipToday } from '$lib/habits/adherence';
import type { Habit, HabitLog, HabitWithLog } from '$lib/database.types';
import { dayViewsFromData, loadDayData, type LoadedDayData } from '$lib/habits/load-day';
import {
	buildFocusCarousel,
	listLogsForDates,
	pendingHabitCount,
	recentLogsMapFromRecord
} from '$lib/habits/service';
import type { HabitFilter } from '$lib/habits/filter';
import { parseDateKey, shiftDateKey } from '$lib/habits/schedule';
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

	focusCarouselFor(options: {
		dateKey?: string;
		focusHabitId?: string | null;
		filter?: HabitFilter;
		unloggedOnly?: boolean;
	}) {
		const dateKey = options.dateKey ?? this.todayDateKey;
		if (!this.ready || !dateKey) {
			return {
				habits: [],
				initialIndex: 0,
				doneCount: 0,
				totalCount: 0,
				pendingCounts: { all: 0, timed: 0, anytime: 0 },
				canSkip: false
			};
		}

		const filter = options.filter ?? 'all';
		const timed = this.timedHabitsFor(dateKey);
		const anytime = this.anytimeHabitsFor(dateKey);
		const { habits, initialIndex } = buildFocusCarousel(timed, anytime, {
			filter,
			unloggedOnly: options.unloggedOnly,
			focusHabitId: options.focusHabitId
		});

		const timedDone = timed.filter((habit) => habit.log).length;
		const anytimeDone = anytime.filter((habit) => habit.log).length;
		const allDone = timedDone + anytimeDone;
		const allTotal = timed.length + anytime.length;
		const doneCount =
			filter === 'timed' ? timedDone : filter === 'anytime' ? anytimeDone : allDone;
		const totalCount =
			filter === 'timed' ? timed.length : filter === 'anytime' ? anytime.length : allTotal;
		const tabCount = (habits: HabitWithLog[]) =>
			options.unloggedOnly ? pendingHabitCount(habits) : habits.length;
		const currentHabit = habits[initialIndex] ?? habits[0] ?? null;
		const anytimeById = new Map(anytime.map((habit) => [habit.id, habit]));

		return {
			habits,
			initialIndex,
			doneCount,
			totalCount,
			pendingCounts: {
				all: tabCount([...timed, ...anytime]),
				timed: tabCount(timed),
				anytime: tabCount(anytime)
			},
			canSkip: currentHabit
				? currentHabit.anchor_time != null
					? this.canSkipHabit(currentHabit, dateKey)
					: (anytimeById.get(currentHabit.id)?.canSkip ?? false)
				: false
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

	async refreshOnResume() {
		if (!this.userId) return;

		const client = createClient();
		const data = await loadDayData(client, this.userId);

		this.timezone = data.timezone;
		this.todayDateKey = data.dateKey;
		this.habits = data.habits;
		this.logs = [
			...this.logs.filter((log) => log.log_date !== data.dateKey),
			...data.logs
		];
		this.recentLogsByHabit = recentLogsMapFromRecord(data.recentLogs);
		this.loadedDateKeys = new Set([...this.loadedDateKeys, data.dateKey]);
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
