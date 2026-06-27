export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export type SchedulePreset = 'daily' | 'weekdays' | 'custom';

export function presetToDays(preset: SchedulePreset, customDays: number[] = []): number[] {
	switch (preset) {
		case 'daily':
			return [...ALL_DAYS];
		case 'weekdays':
			return [...WEEKDAYS];
		case 'custom':
			return [...customDays].sort((a, b) => a - b);
	}
}

export function daysToPreset(activeDays: number[]): {
	preset: SchedulePreset;
	customDays: number[];
} {
	const sorted = [...activeDays].sort((a, b) => a - b);

	if (
		sorted.length === ALL_DAYS.length &&
		ALL_DAYS.every((day) => sorted.includes(day))
	) {
		return { preset: 'daily', customDays: [...ALL_DAYS] };
	}

	if (
		sorted.length === WEEKDAYS.length &&
		WEEKDAYS.every((day) => sorted.includes(day))
	) {
		return { preset: 'weekdays', customDays: [...WEEKDAYS] };
	}

	return { preset: 'custom', customDays: sorted };
}

export function isActiveOnDate(activeDays: number[], date: Date, timezone: string): boolean {
	const weekday = weekdayInTimezone(date, timezone);
	return activeDays.includes(weekday);
}

export function weekdayInTimezone(date: Date, timezone: string): number {
	const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone })
		.formatToParts(date)
		.find((part) => part.type === 'weekday')?.value;

	const map: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6
	};

	return map[weekday ?? 'Sun'] ?? 0;
}

export function dateKeyInTimezone(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: timezone
	}).format(date);
}

export function parseDateKey(dateKey: string): Date {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

export function shiftDateKey(dateKey: string, days: number): string {
	const date = parseDateKey(dateKey);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function weekdayLabel(day: number): string {
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? '';
}
