import type { Habit, HabitLog } from '$lib/database.types';
import { shiftDateKey } from '$lib/habits/schedule';
import {
	mdiEmoticonCryOutline,
	mdiEmoticonHappyOutline,
	mdiEmoticonNeutralOutline,
	mdiEmoticonOutline,
	mdiEmoticonSadOutline
} from '@mdi/js';

function parseTimeToMinutes(time: string): number {
	const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
	return hours * 60 + minutes;
}

export function nowTimeString(
	date = new Date(),
	timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
	return new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: timezone
	}).format(date);
}

export function formatTimeLabel(time: string | null): string {
	if (!time) return '';
	return time.slice(0, 5);
}

export function calculateAdherence(
	habit: Habit,
	input: {
		actualValue?: number | null;
		actualTime?: string | null;
		satisfaction?: number | null;
	}
): number {
	switch (habit.type) {
		case 'do_target': {
			const actual = input.actualValue ?? 0;
			const target = Number(habit.target_value ?? 0);
			if (target <= 0) return 0;
			return Math.min(100, Math.round((actual / target) * 100));
		}
		case 'do_on_time': {
			const target = habit.target_time;
			const actual = input.actualTime;
			if (!target || !actual) return 0;

			const minutesLate = parseTimeToMinutes(actual) - parseTimeToMinutes(target);
			if (minutesLate <= 0) return 100;
			if (minutesLate <= habit.grace_minutes) return 100;

			const penaltyMinutes = minutesLate - habit.grace_minutes;
			const drop = Math.ceil(penaltyMinutes / habit.falloff_minutes_per_10_percent) * 10;
			return Math.max(0, 100 - drop);
		}
		case 'do_binary':
			return input.actualValue === 1 ? 100 : 0;
		case 'avoid':
		case 'rate': {
			const satisfaction = input.satisfaction ?? 1;
			return satisfaction * 20;
		}
	}
}

export function previewAdherenceIcon(score: number): string {
	if (score >= 80) return mdiEmoticonOutline;
	if (score >= 60) return mdiEmoticonHappyOutline;
	if (score >= 40) return mdiEmoticonNeutralOutline;
	if (score >= 20) return mdiEmoticonSadOutline;
	return mdiEmoticonCryOutline;
}

export function defaultInputForHabit(habit: Habit, timezone: string) {
	switch (habit.type) {
		case 'do_target':
			return { actualValue: Number(habit.target_value ?? 0) };
		case 'do_on_time':
			return { actualTime: nowTimeString(new Date(), timezone) };
		case 'do_binary':
			return { actualValue: null };
		case 'avoid':
		case 'rate':
			return { satisfaction: 5 };
	}
}

export function nailedItInput(habit: Habit, timezone: string) {
	if (habit.type === 'do_binary') {
		return { actualValue: 1 };
	}
	if (habit.type === 'do_on_time') {
		return {
			actualTime: habit.target_time?.slice(0, 8) ?? nowTimeString(new Date(), timezone)
		};
	}
	return defaultInputForHabit(habit, timezone);
}

export function inputFromLog(habit: Habit, log: HabitLog, timezone: string) {
	if (log.status === 'logged') {
		return {
			actualValue: log.actual_value,
			actualTime: log.actual_time,
			satisfaction: log.satisfaction
		};
	}
	return defaultInputForHabit(habit, timezone);
}

export function canSubmitLog(
	habit: Habit,
	input: {
		actualValue?: number | null;
		actualTime?: string | null;
		satisfaction?: number | null;
	}
): boolean {
	switch (habit.type) {
		case 'do_target':
			return input.actualValue != null && input.actualValue >= 0;
		case 'do_on_time':
			return Boolean(input.actualTime);
		case 'do_binary':
			return input.actualValue === 0 || input.actualValue === 1;
		case 'avoid':
		case 'rate':
			return input.satisfaction != null && input.satisfaction >= 0 && input.satisfaction <= 5;
	}
}

export function consecutiveSkips(logs: HabitLog[], beforeDateKey: string): number {
	const byDate = new Map(logs.map((log) => [log.log_date, log]));
	let count = 0;
	let cursor = shiftDateKey(beforeDateKey, -1);

	while (true) {
		const log = byDate.get(cursor);
		if (!log || log.status !== 'skipped') break;
		count += 1;
		cursor = shiftDateKey(cursor, -1);
	}

	return count;
}

export function canSkipToday(habit: Habit, recentLogs: HabitLog[], dateKey: string): boolean {
	if (!habit.allow_skip) return false;
	return consecutiveSkips(recentLogs, dateKey) < habit.max_consecutive_skips;
}

export { parseTimeToMinutes };
