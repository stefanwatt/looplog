import { describe, expect, test } from 'bun:test';
import type { Habit } from '$lib/database.types';
import {
	blankCardForm,
	canCheckHabit,
	canNailIt,
	checkPayload,
	checkForm,
	failForm,
	failPayload
} from './card-actions';
import { calculateAdherence } from './adherence';

const binary: Habit = {
	id: '1',
	user_id: 'u',
	name: 'Brush',
	type: 'do_binary',
	category: null,
	active_days: [0, 1, 2, 3, 4, 5, 6],
	allow_skip: true,
	max_consecutive_skips: 3,
	anchor_time: '08:00',
	target_value: null,
	target_unit: null,
	target_time: null,
	grace_minutes: 5,
	falloff_minutes_per_10_percent: 6,
	log_step: 5,
	archived_at: null,
	created_at: '',
	updated_at: ''
};

const target: Habit = {
	...binary,
	id: '2',
	type: 'do_target',
	target_value: 8,
	target_unit: 'glasses'
};

const onTime: Habit = {
	...binary,
	id: '3',
	type: 'do_on_time',
	target_time: '06:00:00'
};

const rate: Habit = {
	...binary,
	id: '4',
	type: 'rate'
};

describe('card-actions', () => {
	test('failPayload for binary logs no', () => {
		expect(failPayload(binary)).toEqual({ actualValue: 0 });
	});

	test('checkPayload for binary logs yes without form input', () => {
		expect(checkPayload(binary, { ...blankCardForm(binary), touched: false })).toEqual({
			actualValue: 1
		});
	});

	test('canCheckHabit for target requires touched input', () => {
		const blank = { ...blankCardForm(target), touched: false };
		expect(canCheckHabit(target, blank)).toBe(false);
		expect(canCheckHabit(target, { ...blank, touched: true, actualValue: 4 })).toBe(true);
	});

	test('canNailIt is false for binary', () => {
		expect(canNailIt(binary)).toBe(false);
		expect(canNailIt(target)).toBe(true);
	});

	test('failForm fills zero values for target habits', () => {
		expect(failForm(target)).toEqual({
			actualValue: 0,
			actualTime: '',
			satisfaction: null,
			touched: true
		});
	});

	test('failPayload for on-time logs zero-adherence time', () => {
		const payload = failPayload(onTime);
		expect(payload.actualTime).toBe('07:05:00');
		expect(calculateAdherence(onTime, payload)).toBe(0);
	});

	test('failForm fills zero-adherence time for on-time habits', () => {
		expect(failForm(onTime)).toEqual({
			actualValue: null,
			actualTime: '07:05',
			satisfaction: null,
			touched: true
		});
	});

	test('checkForm preserves entered target value', () => {
		const form = { ...blankCardForm(target), touched: true, actualValue: 30 };
		expect(checkForm(target, form).actualValue).toBe(30);
		expect(checkPayload(target, checkForm(target, form))).toEqual({ actualValue: 30 });
	});

	test('blankCardForm for rate defaults to 3 stars', () => {
		expect(blankCardForm(rate)).toEqual({
			actualValue: null,
			actualTime: '',
			satisfaction: 3
		});
	});

	test('canCheckHabit for rate allows logging with default stars without touch', () => {
		const blank = { ...blankCardForm(rate), touched: false };
		expect(canCheckHabit(rate, blank)).toBe(true);
		expect(checkPayload(rate, blank)).toEqual({ satisfaction: 3 });
	});
});
