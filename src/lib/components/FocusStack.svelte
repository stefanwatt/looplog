<script lang="ts">
	import HabitCardStack from '$lib/components/HabitCardStack.svelte';
	import type { HabitWithLog } from '$lib/database.types';
	import {
		logHabit,
		resetHabitLog,
		skipHabit,
		type HabitLogPayload
	} from '$lib/habits/log-actions';

	let {
		habits,
		initialIndex = 0,
		timezone,
		dateKey,
		onnavigate,
		onallcomplete
	}: {
		habits: HabitWithLog[];
		initialIndex?: number;
		timezone: string;
		dateKey: string;
		onnavigate?: () => void;
		onallcomplete?: () => void;
	} = $props();

	let error = $state('');

	function handleLog(habit: HabitWithLog, payload: HabitLogPayload) {
		error = '';
		void logHabit(habit, dateKey, payload).catch((err) => {
			error = err instanceof Error ? err.message : 'Could not save log';
		});
	}

	function handleSkip(habit: HabitWithLog) {
		error = '';
		void skipHabit(habit, dateKey).catch((err) => {
			error = err instanceof Error ? err.message : 'Could not skip habit';
		});
	}

	function handleUndo(habit: HabitWithLog) {
		error = '';
		void resetHabitLog(habit.id, dateKey).catch((err) => {
			error = err instanceof Error ? err.message : 'Could not undo log';
		});
	}
</script>

{#if habits.length > 0}
	<div class="flex min-h-0 flex-1 flex-col">
		<HabitCardStack
			{habits}
			{initialIndex}
			{timezone}
			{dateKey}
			{onnavigate}
			onlog={handleLog}
			onskip={handleSkip}
			onundo={handleUndo}
			{onallcomplete}
		/>
	</div>
{/if}

{#if error}
	<p class="mt-4 text-red">{error}</p>
{/if}
