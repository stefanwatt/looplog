import cleaning from '$lib/assets/illustrations/cleaning.svg';
import education from '$lib/assets/illustrations/education.svg';
import exercise from '$lib/assets/illustrations/exercise.svg';
import hygiene from '$lib/assets/illustrations/hygiene.svg';
import morning from '$lib/assets/illustrations/morning.svg';
import night from '$lib/assets/illustrations/night.svg';
import noon from '$lib/assets/illustrations/noon.svg';
import relationship from '$lib/assets/illustrations/relationship.svg';
import selfCare from '$lib/assets/illustrations/self-care.svg';
import sports from '$lib/assets/illustrations/sports.svg';

export type TimeOfDay = 'morning' | 'noon' | 'night';

export type CategoryIllustration =
	| 'cleaning'
	| 'education'
	| 'exercise'
	| 'hygiene'
	| 'relationship'
	| 'self-care'
	| 'sports';

const timeOfDayIllustrations: Record<TimeOfDay, string> = {
	morning,
	noon,
	night
};

const categoryIllustrations: Record<CategoryIllustration, string> = {
	cleaning,
	education,
	exercise,
	hygiene,
	relationship,
	'self-care': selfCare,
	sports
};

export function getTimeOfDayFromHour(hour: number): TimeOfDay {
	if (hour >= 5 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 18) return 'noon';
	return 'night';
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
	return getTimeOfDayFromHour(date.getHours());
}

export function getTimeOfDayFromAnchorTime(anchorTime: string | null): TimeOfDay {
	if (!anchorTime) return getTimeOfDay();
	const hour = Number(anchorTime.slice(0, 2));
	return getTimeOfDayFromHour(Number.isFinite(hour) ? hour : 12);
}

export function getTimeOfDayIllustration(date = new Date()): string {
	return timeOfDayIllustrations[getTimeOfDay(date)];
}

export function getIllustrationForAnchorTime(anchorTime: string | null): string {
	return timeOfDayIllustrations[getTimeOfDayFromAnchorTime(anchorTime)];
}

export function getCategoryIllustration(category: CategoryIllustration): string {
	return categoryIllustrations[category];
}
