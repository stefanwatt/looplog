<script lang="ts">
	import HabitCardStack from '$lib/components/HabitCardStack.svelte';
	import type { HabitWithLog } from '$lib/database.types';
	import {
		logHabit,
		resetHabitLog,
		skipHabit,
		type HabitLogPayload
	} from '$lib/habits/log-actions';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		upcomingHabits,
		timezone,
		canSkip,
		initialDoneCount,
		dateKey,
		doneCount = $bindable(0),
		stackEmpty = $bindable(true),
		undoAvailable = $bindable(false)
	}: {
		upcomingHabits: HabitWithLog[];
		timezone: string;
		canSkip: boolean;
		initialDoneCount: number;
		dateKey: string;
		doneCount?: number;
		stackEmpty?: boolean;
		undoAvailable?: boolean;
	} = $props();

	let dismissedIds = new SvelteSet<string>();
	let doneDelta = $state(0);
	let error = $state('');

	const stackHabits = $derived(upcomingHabits.filter((habit) => !dismissedIds.has(habit.id)));

	$effect(() => {
		doneCount = initialDoneCount + doneDelta;
	});

	$effect(() => {
		stackEmpty = stackHabits.length === 0;
	});

	function dismiss(habitId: string) {
		dismissedIds.add(habitId);
		doneDelta += 1;
		error = '';
	}

	function restore(habitId: string) {
		if (!dismissedIds.has(habitId)) return;
		dismissedIds.delete(habitId);
		doneDelta -= 1;
	}

	function handleLog(habit: HabitWithLog, payload: HabitLogPayload) {
		dismiss(habit.id);
		void logHabit(habit, dateKey, payload).catch((err) => {
			restore(habit.id);
			error = err instanceof Error ? err.message : 'Could not save log';
		});
	}

	function handleSkip(habit: HabitWithLog) {
		dismiss(habit.id);
		void skipHabit(habit, dateKey).catch((err) => {
			restore(habit.id);
			error = err instanceof Error ? err.message : 'Could not skip habit';
		});
	}

	function handleUndo(habit: HabitWithLog) {
		restore(habit.id);
		void resetHabitLog(habit.id, dateKey).catch((err) => {
			dismiss(habit.id);
			error = err instanceof Error ? err.message : 'Could not undo log';
		});
	}
</script>

{#if stackHabits.length > 0 || undoAvailable}
	<div class="flex min-h-0 flex-1 flex-col">
		<HabitCardStack
			habits={stackHabits}
			{timezone}
			{canSkip}
			bind:undoAvailable
			onlog={handleLog}
			onskip={handleSkip}
			onundo={handleUndo}
		/>
	</div>
{/if}

{#if error}
	<p class="mt-4 text-red">{error}</p>
{/if}
