export type HabitFilter = 'all' | 'timed' | 'anytime';

export const habitFilterOptions: { value: HabitFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'timed', label: 'Timed' },
	{ value: 'anytime', label: 'Anytime' }
];

export function parseHabitFilter(value: string | null): HabitFilter {
	if (value === 'timed' || value === 'anytime') return value;
	return 'all';
}

export function parseUnloggedOnly(unlogged: string | null, filter: string | null): boolean {
	if (unlogged === '1' || unlogged === 'true') return true;
	return filter === 'pending';
}

export function tabHref(
	base: '/focus' | '/day',
	options: {
		date?: string;
		filter?: HabitFilter;
		habitId?: string;
		catchUp?: boolean;
		unloggedOnly?: boolean;
		todayDateKey?: string;
	} = {}
) {
	const params = new URLSearchParams();

	if (options.habitId) params.set('habitId', options.habitId);
	if (options.catchUp) params.set('catchUp', '1');
	if (options.unloggedOnly) params.set('unlogged', '1');

	if (options.date) {
		const omitDefaultDate =
			options.todayDateKey != null && options.date === options.todayDateKey;
		if (!omitDefaultDate) {
			params.set('date', options.date);
		}
	}

	if (options.filter && options.filter !== 'all') {
		params.set('filter', options.filter);
	}

	const qs = params.toString();
	return qs ? `${base}?${qs}` : base;
}
