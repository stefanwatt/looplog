import { describe, expect, test } from 'bun:test';
import type { Habit, HabitLog } from '$lib/database.types';
import { logCardStatus } from '$lib/habits/service';

function habit(type: Habit['type']): Habit {
	return {
		id: 'habit-1',
		user_id: 'user',
		name: 'Test',
		type,
		category: null,
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: true,
		max_consecutive_skips: 2,
		anchor_time: null,
		target_value: 10,
		target_unit: 'min',
		target_time: '08:00:00',
		grace_minutes: 5,
		falloff_minutes_per_10_percent: 5,
		log_step: 5,
		archived_at: null,
		created_at: '',
		updated_at: ''
	};
}

function log(overrides: Partial<HabitLog> = {}): HabitLog {
	return {
		id: 'log-1',
		habit_id: 'habit-1',
		user_id: 'user',
		log_date: '2025-06-27',
		status: 'logged',
		actual_value: null,
		actual_time: null,
		satisfaction: null,
		adherence_score: 85,
		created_at: '',
		updated_at: '',
		...overrides
	};
}

describe('logCardStatus', () => {
	test('returns null when no log exists', () => {
		expect(logCardStatus(habit('do_target'), null)).toBeNull();
	});

	test('shows skipped status', () => {
		expect(logCardStatus(habit('do_target'), log({ status: 'skipped', adherence_score: null }))).toEqual({
			variant: 'yellow',
			label: 'Skipped'
		});
	});

	test('shows logged score for measurable habits', () => {
		expect(logCardStatus(habit('do_target'), log({ adherence_score: 85 }))).toEqual({
			variant: 'green',
			label: '85%'
		});
	});

	test('shows binary done state', () => {
		expect(logCardStatus(habit('do_binary'), log({ actual_value: 1, adherence_score: 100 }))).toEqual({
			variant: 'green',
			label: 'Done'
		});
	});

	test('shows binary not-done state', () => {
		expect(logCardStatus(habit('do_binary'), log({ actual_value: 0, adherence_score: 0 }))).toEqual({
			variant: 'red',
			label: 'Not done'
		});
	});
});
