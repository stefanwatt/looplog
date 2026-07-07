import { getDayStore } from '$lib/habits/day.svelte';
import { restartDayRealtime } from '$lib/habits/day-realtime';
import { getStatsStore } from '$lib/habits/stats.svelte';

type ResumeOptions = {
	userId: string;
	reloadStats: boolean;
};

let resumeInFlight: Promise<void> | null = null;

export async function syncOnAppResume(options: ResumeOptions) {
	const day = getDayStore();
	if (!day.ready || !day.userId) return;

	if (resumeInFlight) return resumeInFlight;

	resumeInFlight = (async () => {
		try {
			restartDayRealtime(day.userId!);
			await day.refreshOnResume();

			if (options.reloadStats) {
				await getStatsStore().load(options.userId, { force: true });
			}
		} finally {
			resumeInFlight = null;
		}
	})();

	return resumeInFlight;
}

export function startAppResumeSync(getOptions: () => ResumeOptions) {
	const onResume = () => {
		if (document.visibilityState !== 'visible') return;
		void syncOnAppResume(getOptions());
	};

	document.addEventListener('visibilitychange', onResume);
	window.addEventListener('pageshow', onResume);

	return () => {
		document.removeEventListener('visibilitychange', onResume);
		window.removeEventListener('pageshow', onResume);
	};
}
