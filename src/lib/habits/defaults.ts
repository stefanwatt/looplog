import type { HabitType } from '$lib/database.types';

export const DEFAULT_GRACE_MINUTES = 5;
export const DEFAULT_FALLOFF_MINUTES = 6;
export const DEFAULT_MAX_SKIPS = 3;

export function defaultScoringForType(type: HabitType) {
	switch (type) {
		case 'do_target':
			return {
				target_value: 1,
				target_unit: 'times',
				grace_minutes: DEFAULT_GRACE_MINUTES,
				falloff_minutes_per_10_percent: DEFAULT_FALLOFF_MINUTES
			};
		case 'do_on_time':
			return {
				target_time: '06:00:00',
				grace_minutes: DEFAULT_GRACE_MINUTES,
				falloff_minutes_per_10_percent: DEFAULT_FALLOFF_MINUTES
			};
		case 'avoid':
		case 'rate':
			return {
				grace_minutes: DEFAULT_GRACE_MINUTES,
				falloff_minutes_per_10_percent: DEFAULT_FALLOFF_MINUTES
			};
	}
}
