<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { upsertLog } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';
	import type { HabitWithLog } from '$lib/database.types';
	import { mdiPlus } from '@mdi/js';

	type AnytimeHabit = HabitWithLog & { canSkip: boolean };

	let { data } = $props();

	let busyId = $state<string | null>(null);
	let error = $state('');

	async function handleLog(habit: AnytimeHabit, payload: Record<string, unknown>) {
		if (busyId) return;
		busyId = habit.id;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, habit, data.dateKey, {
				status: 'logged',
				actualValue: payload.actualValue as number | undefined,
				actualTime: payload.actualTime as string | undefined,
				satisfaction: payload.satisfaction as number | undefined
			});

			await invalidateAll();
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
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, habit, data.dateKey, { status: 'skipped' });
			await invalidateAll();
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
						class="flex items-center justify-between rounded-2xl bg-surface-0/40 px-4 py-4 text-green"
					>
						<p class="m-0 text-text">{habit.name}</p>
						<span
							>{habit.log.status === 'skipped'
								? 'Skipped'
								: `${habit.log.adherence_score}%`}</span
						>
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

	<a
		class="fixed right-4 bottom-[5.5rem] grid size-[3.25rem] place-items-center rounded-full bg-blue text-crust no-underline shadow-lg shadow-blue/35"
		href="/habits/new"
		aria-label="Create habit"
	>
		<Icon path={mdiPlus} size={28} />
	</a>
</section>
