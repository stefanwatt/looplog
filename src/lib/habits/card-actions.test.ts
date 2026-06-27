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

const binary: Habit = {
	id: '1',
	user_id: 'u',
	name: 'Brush',
	type: 'do_binary',
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

	test('checkForm preserves entered target value', () => {
		const form = { ...blankCardForm(target), touched: true, actualValue: 30 };
		expect(checkForm(target, form).actualValue).toBe(30);
		expect(checkPayload(target, checkForm(target, form))).toEqual({ actualValue: 30 });
	});
});
