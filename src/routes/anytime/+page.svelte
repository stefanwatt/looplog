<script lang="ts">
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { HabitWithLog } from '$lib/database.types';
	import { logHabit, skipHabit, type HabitLogPayload } from '$lib/habits/log-actions';
	import { mdiPencil } from '@mdi/js';

	type AnytimeHabit = HabitWithLog & { canSkip: boolean };

	let { data } = $props();

	let busyId = $state<string | null>(null);
	let error = $state('');

	async function handleLog(habit: AnytimeHabit, payload: HabitLogPayload) {
		if (busyId) return;
		busyId = habit.id;
		error = '';

		try {
			await logHabit(habit, data.dateKey, payload);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save log';
		} finally {
			busyId = null;
		}
	}

	async function handleSkip(habit: AnytimeHabit) {
		if (busyId) return;
		busyId = habit.id;
		error = '';

		try {
			await skipHabit(habit, data.dateKey);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not skip habit';
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head>
	<title>Anytime · Looplog</title>
</svelte:head>

<section>
	<header>
		<h1 class="m-0 text-2xl font-bold">Anytime</h1>
		<p class="mt-1 mb-4 text-subtext-0">Loose habits without a set time.</p>
	</header>

	{#if data.anytimeHabits.length === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No anytime habits for today.</p>
			<a href="/habits/new" class="text-blue">Create one</a>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each data.anytimeHabits as habit (habit.id)}
				{#if habit.log}
					<div
						class="flex items-center justify-between gap-3 rounded-2xl bg-surface-0/40 px-4 py-4 text-green"
					>
						<p class="m-0 min-w-0 text-text">{habit.name}</p>
						<div class="flex shrink-0 items-center gap-3">
							<span
								>{habit.log.status === 'skipped'
									? 'Skipped'
									: `${habit.log.adherence_score}%`}</span
							>
							<a
								href="/habits/{habit.id}/edit"
								class="grid place-items-center text-subtext-0 no-underline"
								aria-label="Edit {habit.name}"
							>
								<Icon path={mdiPencil} size={18} />
							</a>
						</div>
					</div>
				{:else}
					{#key habit.id}
						<SwipeHabitCard
							{habit}
							timezone={data.timezone}
							canSkip={habit.canSkip}
							busy={busyId === habit.id}
							onlog={(payload) => handleLog(habit, payload)}
							onskip={() => handleSkip(habit)}
						/>
					{/key}
				{/if}
			{/each}
		</div>
	{/if}

	{#if error}
		<p class="mt-4 text-red">{error}</p>
	{/if}
</section>
