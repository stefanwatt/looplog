export const HABIT_CATEGORIES = [
	'cleaning',
	'education',
	'exercise',
	'hygiene',
	'relationship',
	'self-care',
	'sports'
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
	cleaning: 'Cleaning',
	education: 'Education',
	exercise: 'Exercise',
	hygiene: 'Hygiene',
	relationship: 'Relationship',
	'self-care': 'Self care',
	sports: 'Sports'
};
