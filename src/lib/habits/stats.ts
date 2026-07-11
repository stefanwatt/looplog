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

export type HabitDayBreakdownEntry = {
	habit: Habit;
	result: HabitDayResult;
	log: HabitLog | null;
};

export type DayBreakdown = {
	dateKey: string;
	adherence: number | null;
	completion: number | null;
	complete: boolean;
	entries: HabitDayBreakdownEntry[];
};

export type StreakBreakInfo = {
	dateKey: string;
	missedHabits: Habit[];
};

export type BestStreakRun = {
	length: number;
	startDateKey: string;
	endDateKey: string;
	breakDateKey: string | null;
	breakMissedHabits: Habit[];
};

export type HabitMetricImpact = {
	habit: Habit;
	dragPoints: number;
	eligibleDays: number;
};

export const statsWindowOptions: { value: StatsWindow; label: string }[] = [
	{ value: '7d', label: '7 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'all', label: 'All time' }
];

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

export function habitStatsStartDate(
	habit: Habit,
	habitLogs: HabitLog[],
	timezone: string
): string | null {
	const firstLog = trackingStartDate(habitLogs);
	if (!firstLog) return null;

	const createdKey = habitCreatedDateKey(habit, timezone);
	return firstLog > createdKey ? firstLog : createdKey;
}

export function statsTrackingStart(
	habits: Habit[],
	logs: HabitLog[],
	timezone: string
): string | null {
	const logsByHabit = buildLogsByHabit(logs);
	let earliest: string | null = null;

	for (const habit of activeHabits(habits)) {
		const habitLogs = logsByHabit.get(habit.id) ?? [];
		const start = habitStatsStartDate(habit, habitLogs, timezone);
		if (!start) continue;
		if (!earliest || start < earliest) earliest = start;
	}

	return earliest;
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
	timezone: string
): DailyStatsPoint {
	const logsByHabit = buildLogsByHabit(logs);
	const logsByHabitAndDate = buildLogsByHabitAndDate(logs);

	let adherenceTotal = 0;
	let adherenceCount = 0;
	let completionNumerator = 0;
	let completionDenominator = 0;

	for (const habit of habits) {
		const habitLogs = logsByHabit.get(habit.id) ?? [];
		const habitStart = habitStatsStartDate(habit, habitLogs, timezone);
		if (!habitStart) continue;

		const log = logsByHabitAndDate.get(habit.id)?.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, habitStart);

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

export function computeHabitCurrentStreak(
	habit: Habit,
	logs: HabitLog[],
	timezone: string,
	referenceDateKey: string
): number {
	const trackingStart = habitStatsStartDate(habit, logs, timezone) ?? habitCreatedDateKey(habit, timezone);
	const logsByDate = new Map(logs.map((log) => [log.log_date, log]));
	let streak = 0;
	let dateKey = referenceDateKey;

	while (dateKey >= trackingStart) {
		const log = logsByDate.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, logs, timezone, trackingStart);

		if (result.outcome === 'excluded') {
			dateKey = shiftDateKey(dateKey, -1);
			continue;
		}

		if (result.outcome === 'missed') {
			if (dateKey === referenceDateKey && log == null) {
				dateKey = shiftDateKey(dateKey, -1);
				continue;
			}
			break;
		}

		streak += 1;
		dateKey = shiftDateKey(dateKey, -1);
	}

	return streak;
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
	allLogs: HabitLog[],
	start: string,
	end: string,
	timezone: string
): HabitStatsSummary {
	const habitLogs = allLogs.filter((log) => log.habit_id === habit.id);
	const trackingStart = habitStatsStartDate(habit, habitLogs, timezone);

	if (!trackingStart) {
		return {
			habit,
			adherence: null,
			completion: null,
			eligibleDays: 0
		};
	}

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

function activeHabits(habits: Habit[]): Habit[] {
	return habits.filter((habit) => habit.archived_at === null);
}

export function computeStatsSnapshot(
	habits: Habit[],
	logs: HabitLog[],
	timezone: string,
	todayDateKey: string
): StatsSnapshot {
	const habitsForStats = activeHabits(habits);
	const trackingStart = statsTrackingStart(habitsForStats, logs, timezone);
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
			computeDailyStats(habitsForStats, logs, dateKey, timezone)
		);
		dailySeries[window] = points;
		adherence[window] = aggregateMetric(points, 'adherence');
		completion[window] = aggregateMetric(points, 'completion');
	}

	const streakSource = dailySeries.all;
	const streaks = computeStreaks(streakSource);

	const rankingWindowStart = windowStartDate(todayDateKey, '30d', trackingStart);
	const habitRankings = habitsForStats
		.map((habit) =>
			computeHabitStats(
				habit,
				logs,
				rankingWindowStart,
				todayDateKey,
				timezone
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

export function isClosedDay(dateKey: string, todayDateKey: string): boolean {
	return dateKey < todayDateKey;
}

export function formatDateKey(dateKey: string): string {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(new Date(year, month - 1, day));
}

export function outcomeLabel(result: HabitDayResult): string {
	switch (result.outcome) {
		case 'logged':
			return result.score != null ? `${result.score}%` : 'Logged';
		case 'missed':
			return 'Missed';
		case 'skip':
			return 'Skipped';
		case 'excluded':
			return 'Not scheduled';
	}
}

export function computeDayBreakdown(
	habits: Habit[],
	logs: HabitLog[],
	dateKey: string,
	timezone: string
): DayBreakdown {
	const habitsForStats = activeHabits(habits);
	const logsByHabit = buildLogsByHabit(logs);
	const logsByHabitAndDate = buildLogsByHabitAndDate(logs);
	const daily = computeDailyStats(habitsForStats, logs, dateKey, timezone);

	const entries: HabitDayBreakdownEntry[] = [];
	for (const habit of habitsForStats) {
		const habitLogs = logsByHabit.get(habit.id) ?? [];
		const habitStart = habitStatsStartDate(habit, habitLogs, timezone);
		if (!habitStart) continue;

		const log = logsByHabitAndDate.get(habit.id)?.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, habitStart);
		if (result.outcome === 'excluded') continue;
		entries.push({ habit, result, log });
	}

	entries.sort((a, b) => a.habit.name.localeCompare(b.habit.name));

	return {
		dateKey,
		adherence: daily.adherence,
		completion: daily.completion,
		complete: daily.complete,
		entries
	};
}

export function findLastClosedBreakDay(
	points: DailyStatsPoint[],
	todayDateKey: string
): DailyStatsPoint | null {
	for (let index = points.length - 1; index >= 0; index -= 1) {
		const point = points[index];
		if (!isClosedDay(point.dateKey, todayDateKey)) continue;
		if (point.completion == null) continue;
		if (!point.complete) return point;
	}
	return null;
}

export function computeStreakBreakInfo(
	habits: Habit[],
	logs: HabitLog[],
	points: DailyStatsPoint[],
	todayDateKey: string,
	timezone: string
): StreakBreakInfo | null {
	const breakDay = findLastClosedBreakDay(points, todayDateKey);
	if (!breakDay) return null;

	const breakdown = computeDayBreakdown(habits, logs, breakDay.dateKey, timezone);
	const missedHabits = breakdown.entries
		.filter((entry) => entry.result.outcome === 'missed')
		.map((entry) => entry.habit);

	if (missedHabits.length === 0) return null;

	return { dateKey: breakDay.dateKey, missedHabits };
}

export function computeBestStreakRun(
	habits: Habit[],
	logs: HabitLog[],
	points: DailyStatsPoint[],
	timezone: string
): BestStreakRun | null {
	const eligible = points.filter((point) => point.completion != null);
	if (eligible.length === 0) return null;

	let bestLength = 0;
	let bestStart = '';
	let bestEnd = '';
	let bestEndIndex = -1;
	let runLength = 0;
	let runStart = '';

	for (let index = 0; index < eligible.length; index += 1) {
		const point = eligible[index];
		if (point.complete) {
			if (runLength === 0) runStart = point.dateKey;
			runLength += 1;
			if (runLength > bestLength) {
				bestLength = runLength;
				bestStart = runStart;
				bestEnd = point.dateKey;
				bestEndIndex = index;
			}
		} else {
			runLength = 0;
		}
	}

	if (bestLength === 0) return null;

	let breakDateKey: string | null = null;
	for (let index = bestEndIndex + 1; index < eligible.length; index += 1) {
		if (!eligible[index].complete) {
			breakDateKey = eligible[index].dateKey;
			break;
		}
	}

	const breakMissedHabits =
		breakDateKey == null
			? []
			: computeDayBreakdown(habits, logs, breakDateKey, timezone)
					.entries.filter((entry) => entry.result.outcome === 'missed')
					.map((entry) => entry.habit);

	return {
		length: bestLength,
		startDateKey: bestStart,
		endDateKey: bestEnd,
		breakDateKey,
		breakMissedHabits
	};
}

export function computeAdherenceImpact(
	habits: Habit[],
	logs: HabitLog[],
	start: string,
	end: string,
	timezone: string
): HabitMetricImpact[] {
	const habitsForStats = activeHabits(habits);
	const logsByHabit = buildLogsByHabit(logs);
	const logsByHabitAndDate = buildLogsByHabitAndDate(logs);
	const dateKeys = dateKeysInclusive(start, end);

	const impacts = new Map<string, HabitMetricImpact>();

	for (const habit of habitsForStats) {
		impacts.set(habit.id, { habit, dragPoints: 0, eligibleDays: 0 });
	}

	for (const dateKey of dateKeys) {
		const scored: { habit: Habit; score: number }[] = [];

		for (const habit of habitsForStats) {
			const habitLogs = logsByHabit.get(habit.id) ?? [];
			const habitStart = habitStatsStartDate(habit, habitLogs, timezone);
			if (!habitStart) continue;

			const log = logsByHabitAndDate.get(habit.id)?.get(dateKey) ?? null;
			const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, habitStart);

			if (result.outcome !== 'logged' && result.outcome !== 'missed') continue;

			scored.push({ habit, score: result.score ?? 0 });
		}

		if (scored.length === 0) continue;

		const denominator = scored.length;
		for (const { habit, score } of scored) {
			const entry = impacts.get(habit.id);
			if (!entry) continue;
			entry.eligibleDays += 1;
			entry.dragPoints += (100 - score) / denominator;
		}
	}

	return [...impacts.values()]
		.filter((entry) => entry.eligibleDays > 0)
		.sort((a, b) => b.dragPoints - a.dragPoints);
}

export function computeCompletionImpact(
	habits: Habit[],
	logs: HabitLog[],
	start: string,
	end: string,
	timezone: string
): HabitMetricImpact[] {
	const habitsForStats = activeHabits(habits);
	const logsByHabit = buildLogsByHabit(logs);
	const logsByHabitAndDate = buildLogsByHabitAndDate(logs);
	const dateKeys = dateKeysInclusive(start, end);

	const impacts = new Map<string, HabitMetricImpact>();

	for (const habit of habitsForStats) {
		impacts.set(habit.id, { habit, dragPoints: 0, eligibleDays: 0 });
	}

	for (const dateKey of dateKeys) {
		const dayEntries: { habit: Habit; completed: boolean }[] = [];

		for (const habit of habitsForStats) {
			const habitLogs = logsByHabit.get(habit.id) ?? [];
			const habitStart = habitStatsStartDate(habit, habitLogs, timezone);
			if (!habitStart) continue;

			const log = logsByHabitAndDate.get(habit.id)?.get(dateKey) ?? null;
			const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, habitStart);

			if (result.outcome === 'excluded') continue;

			dayEntries.push({
				habit,
				completed: result.outcome === 'logged' || result.outcome === 'skip'
			});
		}

		if (dayEntries.length === 0) continue;

		const denominator = dayEntries.length;
		for (const { habit, completed } of dayEntries) {
			const entry = impacts.get(habit.id);
			if (!entry) continue;
			entry.eligibleDays += 1;
			if (!completed) {
				entry.dragPoints += 100 / denominator;
			}
		}
	}

	return [...impacts.values()]
		.filter((entry) => entry.eligibleDays > 0)
		.sort((a, b) => b.dragPoints - a.dragPoints);
}

export type HabitHistoryEntry = {
	dateKey: string;
	result: HabitDayResult;
	log: HabitLog | null;
};

export function computeHabitHistory(
	habit: Habit,
	allLogs: HabitLog[],
	start: string,
	end: string,
	timezone: string
): HabitHistoryEntry[] {
	const habitLogs = allLogs.filter((log) => log.habit_id === habit.id);
	const trackingStart = habitStatsStartDate(habit, habitLogs, timezone);
	if (!trackingStart) return [];

	const logsByDate = new Map(habitLogs.map((log) => [log.log_date, log]));
	const dateKeys = dateKeysInclusive(start, end);

	const entries: HabitHistoryEntry[] = [];
	for (const dateKey of dateKeys) {
		const log = logsByDate.get(dateKey) ?? null;
		const result = resolveHabitDay(habit, dateKey, log, habitLogs, timezone, trackingStart);
		if (result.outcome === 'excluded') continue;
		entries.push({ dateKey, result, log });
	}

	return entries.reverse();
}
