import { describe, expect, test } from 'bun:test';
import type { Habit } from '$lib/database.types';
import { calculateAdherence, zeroAdherenceTime } from './adherence';

const onTimeHabit = (overrides: Partial<Habit> = {}): Habit => ({
	id: '1',
	user_id: 'u',
	name: 'Wake up',
	type: 'do_on_time',
	category: null,
	active_days: [0, 1, 2, 3, 4, 5, 6],
	allow_skip: true,
	max_consecutive_skips: 3,
	anchor_time: '06:00',
	target_value: null,
	target_unit: null,
	target_time: '06:00:00',
	grace_minutes: 5,
	falloff_minutes_per_10_percent: 6,
	log_step: 5,
	archived_at: null,
	created_at: '',
	updated_at: '',
	...overrides
});

describe('zeroAdherenceTime', () => {
	test('returns the earliest time that scores 0%', () => {
		const habit = onTimeHabit();
		const actualTime = zeroAdherenceTime(habit);

		expect(actualTime).toBe('07:05:00');
		expect(calculateAdherence(habit, { actualTime })).toBe(0);
	});

	test('respects grace and falloff settings', () => {
		const habit = onTimeHabit({
			target_time: '08:00:00',
			grace_minutes: 10,
			falloff_minutes_per_10_percent: 15
		});
		const actualTime = zeroAdherenceTime(habit);

		expect(actualTime).toBe('10:30:00');
		expect(calculateAdherence(habit, { actualTime })).toBe(0);
		expect(
			calculateAdherence(habit, {
				actualTime: '10:25:00'
			})
		).toBe(10);
	});

	test('snaps to the habit log step grid', () => {
		const habit = onTimeHabit({ log_step: 5 });
		const actualTime = zeroAdherenceTime(habit);
		const minutesLate =
			parseInt(actualTime.slice(0, 2), 10) * 60 +
			parseInt(actualTime.slice(3, 5), 10) -
			(6 * 60);

		expect(minutesLate % 5).toBe(0);
		expect(actualTime).toBe('07:05:00');
	});
});
