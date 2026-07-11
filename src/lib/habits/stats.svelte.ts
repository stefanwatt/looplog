import { computeStatsSnapshot, type StatsSnapshot } from '$lib/habits/stats';
import { loadStatsData } from '$lib/habits/load-stats';
import { createClient } from '$lib/supabase/client';
import type { Habit, HabitLog } from '$lib/database.types';

class StatsStore {
	userId = $state<string | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	snapshot = $state<StatsSnapshot | null>(null);
	habits = $state<Habit[]>([]);
	logs = $state<HabitLog[]>([]);
	timezone = $state('UTC');
	todayDateKey = $state('');

	async load(userId: string, options: { force?: boolean } = {}) {
		if (this.loading && !options.force) return;
		this.loading = true;
		this.error = null;

		try {
			const supabase = createClient();
			const data = await loadStatsData(supabase, userId);
			this.userId = userId;
			this.habits = data.habits;
			this.logs = data.logs;
			this.timezone = data.timezone;
			this.todayDateKey = data.todayDateKey;
			this.snapshot = computeStatsSnapshot(
				data.habits,
				data.logs,
				data.timezone,
				data.todayDateKey
			);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Could not load stats';
		} finally {
			this.loading = false;
		}
	}

	reset() {
		this.userId = null;
		this.loading = false;
		this.error = null;
		this.snapshot = null;
		this.habits = [];
		this.logs = [];
		this.timezone = 'UTC';
		this.todayDateKey = '';
	}
}

let statsStore: StatsStore | null = null;

export function getStatsStore() {
	if (!statsStore) {
		statsStore = new StatsStore();
	}
	return statsStore;
}

export function resetStatsStore() {
	statsStore = null;
}
