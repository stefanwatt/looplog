import { describe, expect, test } from 'bun:test';
import type { HabitLog, HabitWithLog } from '$lib/database.types';
import { buildAnytimeHabitStack, buildFocusCarousel, buildFocusStack, buildTimedHabitStack, orderedPendingTimedHabits } from './service';

const timezone = 'UTC';

function atTime(hours: number, minutes = 0): Date {
	return new Date(Date.UTC(2025, 5, 27, hours, minutes, 0));
}

function habit(id: string, name: string, anchorTime: string): HabitWithLog {
	return {
		id,
		user_id: 'user',
		name,
		type: 'do_binary',
		category: null,
		active_days: [0, 1, 2, 3, 4, 5, 6],
		allow_skip: true,
		max_consecutive_skips: 3,
		anchor_time: anchorTime,
		target_value: null,
		target_unit: null,
		target_time: null,
		grace_minutes: 0,
		falloff_minutes_per_10_percent: 10,
		log_step: 5,
		archived_at: null,
		created_at: '',
		updated_at: '',
		log: null
	};
}

describe('orderedPendingTimedHabits', () => {
	test('prefers nearest upcoming habit over long-missed morning habit', () => {
		const habits = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 30), timezone);

		expect(ordered.map((h) => h.id)).toEqual(['evening']);
	});

	test('shows just-missed habit inside grace window when next habit has not started', () => {
		const habits = [
			habit('recent', 'Snack', '16:15'),
			habit('next', 'Dinner', '17:00')
		];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 20), timezone);

		expect(ordered.map((h) => h.id)).toEqual(['recent', 'next']);
	});

	test('drops stale just-missed habit once the next habit has started', () => {
		const habits = [
			habit('stale', 'Snack', '16:15'),
			habit('current', 'Tea', '16:25'),
			habit('later', 'Dinner', '20:00')
		];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 26), timezone);

		expect(ordered.map((h) => h.id)).toEqual(['current', 'later']);
	});

	test('prefers just-missed habit over equally near upcoming habit on tie', () => {
		const habits = [habit('recent', 'Snack', '16:15'), habit('soon', 'Tea', '16:25')];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 20), timezone);

		expect(ordered.map((h) => h.id)).toEqual(['recent', 'soon']);
	});

	test('returns empty when only long-missed habits remain', () => {
		const habits = [habit('morning', 'Brush Teeth (Morning)', '08:00')];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 30), timezone);

		expect(ordered).toEqual([]);
	});

	test('ignores habits that already have logs', () => {
		const afternoonLog: HabitLog = {
			id: 'log-1',
			habit_id: 'afternoon',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: null,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const habits: HabitWithLog[] = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			{ ...habit('afternoon', 'Walk', '12:00'), log: afternoonLog },
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 30), timezone);

		expect(ordered.map((h) => h.id)).toEqual(['evening']);
	});
});

describe('buildTimedHabitStack', () => {
	test('puts focused habit on top even when relevance would drop it', () => {
		const habits = [habit('morning', 'Brush Teeth (Morning)', '08:00')];

		const stack = buildTimedHabitStack(habits, {
			timezone,
			focusHabitId: 'morning',
			now: atTime(16, 30)
		});

		expect(stack.map((h) => h.id)).toEqual(['morning']);
	});

	test('puts focused habit first and keeps regular ordering for the rest', () => {
		const habits = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];

		const stack = buildTimedHabitStack(habits, {
			timezone,
			focusHabitId: 'morning',
			now: atTime(16, 30)
		});

		expect(stack.map((h) => h.id)).toEqual(['morning', 'evening']);
	});

	test('includes logged focused habit for editing', () => {
		const afternoonLog: HabitLog = {
			id: 'log-1',
			habit_id: 'afternoon',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 1,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const habits: HabitWithLog[] = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			{ ...habit('afternoon', 'Walk', '12:00'), log: afternoonLog },
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];

		const stack = buildTimedHabitStack(habits, {
			timezone,
			focusHabitId: 'afternoon',
			now: atTime(16, 30)
		});

		expect(stack.map((h) => h.id)).toEqual(['afternoon', 'evening']);
	});

	test('falls back to regular ordering when focus id is unknown', () => {
		const habits = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];

		const stack = buildTimedHabitStack(habits, {
			timezone,
			focusHabitId: 'missing',
			now: atTime(16, 30)
		});

		const ordered = orderedPendingTimedHabits(habits, atTime(16, 30), timezone);
		expect(stack.map((h) => h.id)).toEqual(ordered.map((h) => h.id));
	});
});

function anytimeHabit(id: string, name: string): HabitWithLog {
	return {
		...habit(id, name, '08:00'),
		anchor_time: null
	};
}

describe('buildAnytimeHabitStack', () => {
	test('returns pending anytime habits alphabetically', () => {
		const habits = [anytimeHabit('b', 'Brush'), anytimeHabit('a', 'Apple')];

		const stack = buildAnytimeHabitStack(habits);

		expect(stack.map((h) => h.id)).toEqual(['a', 'b']);
	});

	test('puts focused anytime habit first even when logged', () => {
		const logged: HabitLog = {
			id: 'log-1',
			habit_id: 'a',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 1,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const habits: HabitWithLog[] = [
			{ ...anytimeHabit('a', 'Apple'), log: logged },
			anytimeHabit('b', 'Brush')
		];

		const stack = buildAnytimeHabitStack(habits, { focusHabitId: 'a' });

		expect(stack.map((h) => h.id)).toEqual(['a', 'b']);
	});
});

describe('buildFocusCarousel', () => {
	test('includes all active habits for the day when filter is all', () => {
		const afternoonLog: HabitLog = {
			id: 'log-1',
			habit_id: 'afternoon',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 1,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const timed = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			{ ...habit('afternoon', 'Walk', '12:00'), log: afternoonLog },
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];
		const anytime = [anytimeHabit('water', 'Drink Water')];

		const carousel = buildFocusCarousel(timed, anytime, { filter: 'all' });

		expect(carousel.habits.map((h) => h.id)).toEqual(['morning', 'afternoon', 'evening', 'water']);
		expect(carousel.initialIndex).toBe(0);
	});

	test('starts at focused habit index even when logged', () => {
		const logged: HabitLog = {
			id: 'log-1',
			habit_id: 'water',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 4,
			actual_time: null,
			satisfaction: null,
			adherence_score: 50,
			created_at: '',
			updated_at: ''
		};

		const timed = [habit('evening', 'Brush Teeth (Evening)', '17:00')];
		const anytime = [{ ...anytimeHabit('water', 'Drink Water'), log: logged }];

		const carousel = buildFocusCarousel(timed, anytime, {
			filter: 'all',
			focusHabitId: 'water'
		});

		expect(carousel.habits.map((h) => h.id)).toEqual(['evening', 'water']);
		expect(carousel.initialIndex).toBe(1);
	});

	test('returns only anytime habits when filter is anytime', () => {
		const timed = [habit('evening', 'Brush Teeth (Evening)', '17:00')];
		const anytime = [anytimeHabit('water', 'Drink Water'), anytimeHabit('stretch', 'Stretch')];

		const carousel = buildFocusCarousel(timed, anytime, { filter: 'anytime' });

		expect(carousel.habits.map((h) => h.id)).toEqual(['water', 'stretch']);
	});

	test('returns only unlogged habits when unloggedOnly is true', () => {
		const afternoonLog: HabitLog = {
			id: 'log-1',
			habit_id: 'afternoon',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 1,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const timed = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			{ ...habit('afternoon', 'Walk', '12:00'), log: afternoonLog },
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];
		const anytime = [anytimeHabit('water', 'Drink Water')];

		const carousel = buildFocusCarousel(timed, anytime, { filter: 'all', unloggedOnly: true });

		expect(carousel.habits.map((h) => h.id)).toEqual(['morning', 'evening', 'water']);
	});

	test('returns only unlogged timed habits when filter is timed and unloggedOnly is true', () => {
		const afternoonLog: HabitLog = {
			id: 'log-1',
			habit_id: 'afternoon',
			user_id: 'user',
			log_date: '2025-06-27',
			status: 'logged',
			actual_value: 1,
			actual_time: null,
			satisfaction: null,
			adherence_score: 100,
			created_at: '',
			updated_at: ''
		};

		const timed = [
			habit('morning', 'Brush Teeth (Morning)', '08:00'),
			{ ...habit('afternoon', 'Walk', '12:00'), log: afternoonLog },
			habit('evening', 'Brush Teeth (Evening)', '17:00')
		];
		const anytime = [anytimeHabit('water', 'Drink Water')];

		const carousel = buildFocusCarousel(timed, anytime, { filter: 'timed', unloggedOnly: true });

		expect(carousel.habits.map((h) => h.id)).toEqual(['morning', 'evening']);
	});
});

describe('buildFocusStack', () => {
	test('combines timed and anytime habits when filter is all', () => {
		const timed = [habit('evening', 'Brush Teeth (Evening)', '17:00')];
		const anytime = [anytimeHabit('water', 'Drink Water')];

		const stack = buildFocusStack(timed, anytime, {
			timezone,
			now: atTime(16, 30)
		});

		expect(stack.map((h) => h.id)).toEqual(['evening', 'water']);
	});

	test('returns only anytime habits when filter is anytime', () => {
		const timed = [habit('evening', 'Brush Teeth (Evening)', '17:00')];
		const anytime = [anytimeHabit('water', 'Drink Water')];

		const stack = buildFocusStack(timed, anytime, {
			filter: 'anytime',
			timezone,
			now: atTime(16, 30)
		});

		expect(stack.map((h) => h.id)).toEqual(['water']);
	});
});
