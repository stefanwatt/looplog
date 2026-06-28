create type public.habit_category as enum (
	'cleaning',
	'education',
	'exercise',
	'hygiene',
	'relationship',
	'self-care',
	'sports'
);

alter table public.habits
	add column category public.habit_category;
