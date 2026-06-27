import { error } from '@sveltejs/kit';
import { parseStatsMetric, parseStatsWindow } from '$lib/habits/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	if (!parseStatsMetric(params.metric) || !parseStatsWindow(params.window)) {
		error(404, 'Not found');
	}

	return {};
};
