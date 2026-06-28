import { describe, expect, test } from 'bun:test';
import {
	clampDayMinutes,
	minutesToTimeString,
	quickTargetOptions,
	quickTimeOptions
} from './log-input';

describe('log-input', () => {
	test('quickTargetOptions returns round steps below target', () => {
		expect(quickTargetOptions(60)).toEqual([
			{ value: 10, label: '10' },
			{ value: 20, label: '20' },
			{ value: 30, label: '30' },
			{ value: 40, label: '40' },
			{ value: 50, label: '50' }
		]);
	});

	test('quickTargetOptions omits zero and target', () => {
		expect(quickTargetOptions(8)).toEqual([
			{ value: 1, label: '1' },
			{ value: 2, label: '2' },
			{ value: 3, label: '3' },
			{ value: 4, label: '4' },
			{ value: 5, label: '5' }
		]);
		expect(quickTargetOptions(1)).toEqual([]);
	});

	test('quickTimeOptions includes on-time and now with compact labels', () => {
		const options = quickTimeOptions('06:00', 5, 10, 6 * 60 + 12);
		expect(options.some((option) => option.icon === 'exact')).toBe(true);
		expect(options.some((option) => option.icon === 'now')).toBe(true);
		expect(options.length).toBeLessThanOrEqual(5);
	});

	test('minutesToTimeString formats day minutes', () => {
		expect(minutesToTimeString(6 * 60 + 7)).toBe('06:07');
	});

	test('clampDayMinutes keeps values within a day', () => {
		expect(clampDayMinutes(-5)).toBe(0);
		expect(clampDayMinutes(24 * 60)).toBe(24 * 60 - 1);
	});
});
