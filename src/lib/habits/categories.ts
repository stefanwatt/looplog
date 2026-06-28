export const HABIT_CATEGORIES = [
	'cleaning',
	'education',
	'exercise',
	'hygiene',
	'nutrition',
	'relationship',
	'self-care',
	'work'
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
	cleaning: 'Cleaning',
	education: 'Education',
	exercise: 'Exercise',
	hygiene: 'Hygiene',
	nutrition: 'Nutrition',
	relationship: 'Relationship',
	'self-care': 'Self care',
	work: 'Work'
};
