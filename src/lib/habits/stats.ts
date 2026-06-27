import type { Habit, HabitLog } from '$lib/database.types';
import { consecutiveSkips } from '$lib/habits/adherence';
import {
	dateKeyInTimezone,
	isActiveOnDate,
	parseDateKey,
	shiftDateKey
} from '$lib/habits/schedule';

export type StatsWindow = '7d' | '30d' | 'all';
export type StatsMetric = 'adherence' | 'completion' | 'streak-current' | 'streak-best';

export type HabitDayOutcome = 'excluded' | 'skip' | 'logged' | 'missed';

export type HabitDayResult = {
	outcome: HabitDayOutcome;
	score: number | null;
};

export type DailyStatsPoint = {
	dateKey: string;
	adherence: number | null;
	completion: number | null;
	complete: boolean;
};

export type HabitStatsSummary = {
	habit: Habit;
	adherence: number | null;
	completion: number | null;
	eligibleDays: number;
};

export type StatsSnapshot = {
	trackingStart: string | null;
	todayDateKey: string;
	adherence: Record<StatsWindow, number | null>;
	completion: Record<StatsWindow, number | null>;
	currentStreak: number;
	bestStreak: number;
	dailySeries: Record<StatsWindow, DailyStatsPoint[]>;
	habitRankings: HabitStatsSummary[];
};

export function trackingStartDate(logs: HabitLog[]): string | null {
	if (logs.length === 0) return null;

	let earliest = logs[0].log_date;
	for (const log of logs) {
		if (log.log_date < earliest) earliest = log.log_date;
	}
	return earliest;
}

export function habitCreatedDateKey(habit: Habit, timezone: string): string {
	return dateKeyInTimezone(new Date(habit.created_at), timezone);
}

export function habitArchivedDateKey(habit: Habit, timezone: string): string | null {
	if (!habit.archived_at) return null;
	return dateKeyInTimezone(new Date(habit.archived_at), timezone);
}

export function isPenaltyFreeSkip(habit: Habit, log: HabitLog, habitLogs: HabitLog[]): boolean {
	if (log.status !== 'skipped' || !habit.allow_skip) return false;
	return consecutiveSkips(habitLogs, log.log_date) < habit.max_consecutive_skips;
}

export function isEligibleHabitDay(
	habit: Habit,
	dateKey: string,
	timezone: string,
	trackingStart: string
): boolean {
	if (dateKey < trackingStart) return false;

	const createdKey = habitCreatedDateKey(habit, timezone);
	if (dateKey < createdKey) return false;

	const archivedKey = habitArchivedDateKey(habit, timezone);
	if (archivedKey && dateKey > archivedKey) return false;

	return isActiveOnDate(habit.active_days, parseDateKey(dateKey), timezone);
}

export function resolveHabitDay(
	habit: Habit,
	dateKey: string,
	log: HabitLog | null,
	habitLogs: HabitLog[],
	timezone: string,
	trackingStart: string
): HabitDayResult {
	if (!isEligibleHabitDay(habit, dateKey, timezone, trackingStart)) {
		return { outcome: 'excluded', score: null };
	}

	if (!log) {
		return { outcome: 'missed', score: 0 };
	}

	if (log.status === 'skipped') {
		if (isPenaltyFreeSkip(habit, log, habitLogs)) {
			return { outcome: 'skip', score: null };
		}
		return { outcome: 'missed', score: 0 };
	}

	return { outcome: 'logged', score: log.adherence_score ?? 0 };
}

export function windowStartDate(
	todayDateKey: string,
	window: StatsWindow,
	trackingStart: string
): string {
	if (window === 'all') return trackingStart;

	const span = window === '7d' ? 7 : 30;
	const start = shiftDateKey(todayDateKey, -(span - 1));
	return start < trackingStart ? trackingStart : start;
}

export function dateKeysInclusive(start: string, end: string): string[] {
	if (start > end) return [];

	const keys: string[] = [];
	let cursor = start;
	while (cursor <= end) {
		keys.push(cursor);
		cursor = shiftDateKey(cursor, 1);
	}
	return keys;
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildLogsByHabit(logs: HabitLog[]): Map<string, HabitLog[]> {
	const map = new Map<string, HabitLog[]>();
	for (const log of logs) {
		const existing = map.get(log.habit_id) ?? [];
		existing.push(log);
		map.set(log.habit_id, existing);
	}
	for (const [habitId, habitLogs] of map) {
		map.set(
			habitId,
			[...habitLogs].sort((a, b) => a.log_date.localeCompare(b.log_date))
		);
	}
	return map;
}

function buildLogsByHabitAndDate(logs: HabitLog[]): Map<string, Map<string, HabitLog>> {
	const map = new Map<string, Map<string, HabitLog>>();
	for (const log of logs) {
		const byDate = map.get(log.habit_id) ?? new Map<string, HabitLog>();
		byDate.set(log.log_date, log);
		map.set(log.habit_id, byDate);
	}
	return map;
}

export function computeDailyStats(
	habits: Habit[],
	logs: HabitLog[],
	dateKey: string,
	timezone: string,
	trackingStart: string
): DailyStatsPoint {
	const logsByHabit = buildLogsByHabit(logs);
	const logsByHabitAndDate = buildLogsByHabitAndDate(logs);

	let adherenceTotal = 0;
	let adherenceCount = 0;
	let completionNumerator = 0;
	let completionDenominator = 0;

	for (const habit of habits) {
		const habitLogs = logsByHabit.get(habit.id) ?? [];
		const log = logsByHabitAndDate.get(habit.id)?.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, trackingStart);

		if (result.outcome === 'excluded') continue;

		completionDenominator += 1;
		if (result.outcome === 'logged' || result.outcome === 'skip') {
			completionNumerator += 1;
		}

		if (result.outcome === 'logged' || result.outcome === 'missed') {
			adherenceTotal += result.score ?? 0;
			adherenceCount += 1;
		}
	}

	return {
		dateKey,
		adherence: adherenceCount > 0 ? Math.round(adherenceTotal / adherenceCount) : null,
		completion:
			completionDenominator > 0
				? Math.round((completionNumerator / completionDenominator) * 100)
				: null,
		complete: completionDenominator > 0 && completionNumerator === completionDenominator
	};
}

function aggregateMetric(
	points: DailyStatsPoint[],
	metric: 'adherence' | 'completion'
): number | null {
	const values = points
		.map((point) => (metric === 'adherence' ? point.adherence : point.completion))
		.filter((value): value is number => value != null);
	return average(values);
}

function computeStreaks(points: DailyStatsPoint[]): { current: number; best: number } {
	const eligible = points.filter(
		(point) => point.adherence != null || point.completion != null
	);
	if (eligible.length === 0) return { current: 0, best: 0 };

	let best = 0;
	let run = 0;
	for (const point of eligible) {
		if (point.complete) {
			run += 1;
			best = Math.max(best, run);
		} else {
			run = 0;
		}
	}

	let current = 0;
	for (let index = eligible.length - 1; index >= 0; index -= 1) {
		if (!eligible[index].complete) break;
		current += 1;
	}

	return { current, best };
}

export function computeHabitStats(
	habit: Habit,
	logs: HabitLog[],
	allLogs: HabitLog[],
	start: string,
	end: string,
	timezone: string,
	trackingStart: string
): HabitStatsSummary {
	const habitLogs = allLogs.filter((log) => log.habit_id === habit.id);
	const logsByDate = new Map(habitLogs.map((log) => [log.log_date, log]));
	const dateKeys = dateKeysInclusive(start, end);

	let adherenceTotal = 0;
	let adherenceCount = 0;
	let completionNumerator = 0;
	let completionDenominator = 0;

	for (const dateKey of dateKeys) {
		const log = logsByDate.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, trackingStart);

		if (result.outcome === 'excluded') continue;

		completionDenominator += 1;
		if (result.outcome === 'logged' || result.outcome === 'skip') {
			completionNumerator += 1;
		}

		if (result.outcome === 'logged' || result.outcome === 'missed') {
			adherenceTotal += result.score ?? 0;
			adherenceCount += 1;
		}
	}

	return {
		habit,
		adherence: adherenceCount > 0 ? Math.round(adherenceTotal / adherenceCount) : null,
		completion:
			completionDenominator > 0
				? Math.round((completionNumerator / completionDenominator) * 100)
				: null,
		eligibleDays: completionDenominator
	};
}

export function computeStatsSnapshot(
	habits: Habit[],
	logs: HabitLog[],
	timezone: string,
	todayDateKey: string
): StatsSnapshot {
	const trackingStart = trackingStartDate(logs);
	const emptyWindows = { '7d': null, '30d': null, all: null } as Record<StatsWindow, number | null>;

	if (!trackingStart) {
		return {
			trackingStart: null,
			todayDateKey,
			adherence: { ...emptyWindows },
			completion: { ...emptyWindows },
			currentStreak: 0,
			bestStreak: 0,
			dailySeries: { '7d': [], '30d': [], all: [] },
			habitRankings: []
		};
	}

	const windows: StatsWindow[] = ['7d', '30d', 'all'];
	const dailySeries = {} as Record<StatsWindow, DailyStatsPoint[]>;
	const adherence = {} as Record<StatsWindow, number | null>;
	const completion = {} as Record<StatsWindow, number | null>;

	for (const window of windows) {
		const start = windowStartDate(todayDateKey, window, trackingStart);
		const keys = dateKeysInclusive(start, todayDateKey);
		const points = keys.map((dateKey) =>
			computeDailyStats(habits, logs, dateKey, timezone, trackingStart)
		);
		dailySeries[window] = points;
		adherence[window] = aggregateMetric(points, 'adherence');
		completion[window] = aggregateMetric(points, 'completion');
	}

	const streakSource = dailySeries.all;
	const streaks = computeStreaks(streakSource);

	const rankingWindowStart = windowStartDate(todayDateKey, '30d', trackingStart);
	const habitRankings = habits
		.map((habit) =>
			computeHabitStats(
				habit,
				logs,
				logs,
				rankingWindowStart,
				todayDateKey,
				timezone,
				trackingStart
			)
		)
		.filter((summary) => summary.eligibleDays > 0)
		.sort((a, b) => (b.adherence ?? -1) - (a.adherence ?? -1));

	return {
		trackingStart,
		todayDateKey,
		adherence,
		completion,
		currentStreak: streaks.current,
		bestStreak: streaks.best,
		dailySeries,
		habitRankings
	};
}

export function metricLabel(metric: StatsMetric): string {
	switch (metric) {
		case 'adherence':
			return 'Avg adherence';
		case 'completion':
			return 'Completion rate';
		case 'streak-current':
			return 'Current streak';
		case 'streak-best':
			return 'Best streak';
	}
}

export function windowLabel(window: StatsWindow): string {
	switch (window) {
		case '7d':
			return '7 days';
		case '30d':
			return '30 days';
		case 'all':
			return 'All time';
	}
}

export function formatMetricValue(metric: StatsMetric, value: number | null): string {
	if (value == null) return '—';
	if (metric === 'adherence' || metric === 'completion') return `${value}%`;
	return `${value}d`;
}

export function parseStatsMetric(value: string): StatsMetric | null {
	if (
		value === 'adherence' ||
		value === 'completion' ||
		value === 'streak-current' ||
		value === 'streak-best'
	) {
		return value;
	}
	return null;
}

export function parseStatsWindow(value: string): StatsWindow | null {
	if (value === '7d' || value === '30d' || value === 'all') return value;
	return null;
}

export function metricSeries(
	snapshot: StatsSnapshot,
	metric: StatsMetric,
	window: StatsWindow
): DailyStatsPoint[] {
	const points = snapshot.dailySeries[window] ?? [];

	if (metric === 'adherence') return points;
	if (metric === 'completion') return points;

	return points.map((point) => ({
		...point,
		adherence: point.complete ? 100 : point.completion != null ? 0 : null
	}));
}

export function metricValue(snapshot: StatsSnapshot, metric: StatsMetric, window: StatsWindow): number | null {
	switch (metric) {
		case 'adherence':
			return snapshot.adherence[window];
		case 'completion':
			return snapshot.completion[window];
		case 'streak-current':
			return snapshot.currentStreak;
		case 'streak-best':
			return snapshot.bestStreak;
	}
}

export function chartValue(point: DailyStatsPoint, metric: StatsMetric): number | null {
	switch (metric) {
		case 'adherence':
			return point.adherence;
		case 'completion':
			return point.completion;
		case 'streak-current':
		case 'streak-best':
			return point.complete ? 100 : point.completion != null ? 0 : null;
	}
}
