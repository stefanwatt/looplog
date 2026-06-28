import { describe, expect, test } from 'bun:test';
import type { Habit, HabitLog } from '$lib/database.types';
import {
	computeDailyStats,
	computeStatsSnapshot,
	isEligibleHabitDay,
	isPenaltyFreeSkip,
	resolveHabitDay,
	trackingStartDate,
	windowStartDate
} from './stats';

const timezone = 'UTC';

function habit(overrides: Partial<Habit> = {}): Habit {
	return {
		id: 'habit-1',
		user_id: 'user',
		name: 'Test habit',
		type: 'do_binary',
		category: null,
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: true,
		max_consecutive_skips: 2,
		anchor_time: null,
		target_value: null,
		target_unit: null,
		target_time: null,
		grace_minutes: 5,
		falloff_minutes_per_10_percent: 6,
		log_step: 5,
		archived_at: null,
		created_at: '2025-06-01T00:00:00.000Z',
		updated_at: '2025-06-01T00:00:00.000Z',
		...overrides
	};
}

function log(overrides: Partial<HabitLog> = {}): HabitLog {
	return {
		id: 'log-1',
		habit_id: 'habit-1',
		user_id: 'user',
		log_date: '2025-06-10',
		status: 'logged',
		actual_value: 1,
		actual_time: null,
		satisfaction: null,
		adherence_score: 100,
		created_at: '2025-06-10T00:00:00.000Z',
		updated_at: '2025-06-10T00:00:00.000Z',
		...overrides
	};
}

describe('trackingStartDate', () => {
	test('returns earliest log date', () => {
		expect(
			trackingStartDate([
				log({ log_date: '2025-06-12' }),
				log({ id: 'log-2', log_date: '2025-06-08' })
			])
		).toBe('2025-06-08');
	});
});

describe('resolveHabitDay', () => {
	test('excludes days before tracking start', () => {
		const result = resolveHabitDay(habit(), '2025-06-05', null, [], timezone, '2025-06-10');
		expect(result.outcome).toBe('excluded');
	});

	test('counts missed eligible days as zero', () => {
		const result = resolveHabitDay(habit(), '2025-06-10', null, [], timezone, '2025-06-10');
		expect(result).toEqual({ outcome: 'missed', score: 0 });
	});

	test('excludes penalty-free skips from adherence', () => {
		const skipped = log({ status: 'skipped', adherence_score: null });
		const result = resolveHabitDay(habit(), '2025-06-10', skipped, [], timezone, '2025-06-10');
		expect(result).toEqual({ outcome: 'skip', score: null });
	});

	test('treats disallowed skips as misses', () => {
		const skipped = log({ status: 'skipped', adherence_score: null });
		const result = resolveHabitDay(
			habit({ allow_skip: false }),
			'2025-06-10',
			skipped,
			[],
			timezone,
			'2025-06-10'
		);
		expect(result).toEqual({ outcome: 'missed', score: 0 });
	});
});

describe('isPenaltyFreeSkip', () => {
	test('respects consecutive skip threshold', () => {
		const h = habit({ max_consecutive_skips: 2 });
		const prior = [
			log({ id: '1', log_date: '2025-06-08', status: 'skipped', adherence_score: null }),
			log({ id: '2', log_date: '2025-06-09', status: 'skipped', adherence_score: null })
		];
		const next = log({ id: '3', log_date: '2025-06-10', status: 'skipped', adherence_score: null });
		expect(isPenaltyFreeSkip(h, next, prior)).toBe(false);
	});
});

describe('computeDailyStats', () => {
	test('does not penalize days before tracking start', () => {
		const habits = [habit()];
		const logs = [log({ log_date: '2025-06-10' })];
		const before = computeDailyStats(habits, logs, '2025-06-09', timezone, '2025-06-10');
		expect(before.adherence).toBeNull();
		expect(before.completion).toBeNull();
	});

	test('averages adherence across habits', () => {
		const habits = [
			habit({ id: 'h1' }),
			habit({ id: 'h2', name: 'Second', created_at: '2025-06-01T00:00:00.000Z' })
		];
		const logs = [
			log({ habit_id: 'h1', log_date: '2025-06-10', adherence_score: 100 }),
			log({
				id: 'log-2',
				habit_id: 'h2',
				log_date: '2025-06-10',
				adherence_score: 60
			})
		];

		const day = computeDailyStats(habits, logs, '2025-06-10', timezone, '2025-06-10');
		expect(day.adherence).toBe(80);
		expect(day.completion).toBe(100);
		expect(day.complete).toBe(true);
	});
});

describe('computeStatsSnapshot', () => {
	test('returns empty snapshot without logs', () => {
		const snapshot = computeStatsSnapshot([habit()], [], timezone, '2025-06-15');
		expect(snapshot.trackingStart).toBeNull();
		expect(snapshot.adherence['7d']).toBeNull();
	});

	test('computes window-limited adherence', () => {
		const habits = [habit()];
		const logs = [
			log({ log_date: '2025-06-10', adherence_score: 100 }),
			log({ id: 'log-2', log_date: '2025-06-11', adherence_score: 50 }),
			log({ id: 'log-3', log_date: '2025-06-12', adherence_score: 0 })
		];

		const snapshot = computeStatsSnapshot(habits, logs, timezone, '2025-06-12');
		expect(snapshot.trackingStart).toBe('2025-06-10');
		expect(windowStartDate('2025-06-12', '7d', '2025-06-10')).toBe('2025-06-10');
		expect(snapshot.adherence['7d']).toBe(50);
		expect(snapshot.currentStreak).toBe(3);
	});
});

describe('isEligibleHabitDay', () => {
	test('excludes days before habit creation', () => {
		expect(isEligibleHabitDay(habit(), '2025-05-31', timezone, '2025-05-01')).toBe(false);
		expect(isEligibleHabitDay(habit(), '2025-06-02', timezone, '2025-05-01')).toBe(true);
	});
});
