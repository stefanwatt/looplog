import CleaningIllustration from '$lib/components/illustrations/CleaningIllustration.svelte';
import EducationIllustration from '$lib/components/illustrations/EducationIllustration.svelte';
import ExerciseIllustration from '$lib/components/illustrations/ExerciseIllustration.svelte';
import HygieneIllustration from '$lib/components/illustrations/HygieneIllustration.svelte';
import MorningIllustration from '$lib/components/illustrations/MorningIllustration.svelte';
import NightIllustration from '$lib/components/illustrations/NightIllustration.svelte';
import NoDataIllustration from '$lib/components/illustrations/NoDataIllustration.svelte';
import NoonIllustration from '$lib/components/illustrations/NoonIllustration.svelte';
import NutritionIllustration from '$lib/components/illustrations/NutritionIllustration.svelte';
import RelationshipIllustration from '$lib/components/illustrations/RelationshipIllustration.svelte';
import SelfCareIllustration from '$lib/components/illustrations/SelfCareIllustration.svelte';
import WorkIllustration from '$lib/components/illustrations/WorkIllustration.svelte';
import type { HabitCategory } from '$lib/habits/categories';
import type { Habit } from '$lib/database.types';
import type { Component } from 'svelte';
import type { SVGAttributes } from 'svelte/elements';

export type TimeOfDay = 'morning' | 'noon' | 'night';

export type IllustrationComponent = Component<
	{
		class?: string;
	} & SVGAttributes<SVGSVGElement>
>;

const timeOfDayIllustrations: Record<TimeOfDay, IllustrationComponent> = {
	morning: MorningIllustration,
	noon: NoonIllustration,
	night: NightIllustration
};

const categoryIllustrations: Record<HabitCategory, IllustrationComponent> = {
	cleaning: CleaningIllustration,
	education: EducationIllustration,
	exercise: ExerciseIllustration,
	hygiene: HygieneIllustration,
	nutrition: NutritionIllustration,
	relationship: RelationshipIllustration,
	'self-care': SelfCareIllustration,
	work: WorkIllustration
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

export function getTimeOfDayIllustration(date = new Date()): IllustrationComponent {
	return timeOfDayIllustrations[getTimeOfDay(date)];
}

export function getIllustrationForAnchorTime(anchorTime: string | null): IllustrationComponent {
	return timeOfDayIllustrations[getTimeOfDayFromAnchorTime(anchorTime)];
}

export function getCategoryIllustration(category: HabitCategory): IllustrationComponent {
	return categoryIllustrations[category];
}

export function getHabitIllustration(
	habit: Pick<Habit, 'category' | 'anchor_time'>
): IllustrationComponent {
	if (habit.category) return getCategoryIllustration(habit.category);
	return getIllustrationForAnchorTime(habit.anchor_time);
}

export { NoDataIllustration };
