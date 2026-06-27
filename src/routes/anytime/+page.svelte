<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import { upsertLog } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';
	import type { HabitWithLog } from '$lib/database.types';

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

<section class="page">
	<header class="page__header">
		<h1>Anytime</h1>
		<p>Loose habits without a set time.</p>
	</header>

	{#if data.anytimeHabits.length === 0}
		<div class="empty">
			<p>No anytime habits for today.</p>
			<a href="/habits/new">Create one</a>
		</div>
	{:else}
		<div class="list">
			{#each data.anytimeHabits as habit (habit.id)}
				{#if habit.log}
					<div class="done">
						<p>{habit.name}</p>
						<span>{habit.log.status === 'skipped' ? 'Skipped' : `${habit.log.adherence_score}%`}</span>
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
		<p class="error">{error}</p>
	{/if}

	<a class="fab" href="/habits/new" aria-label="Create habit">+</a>
</section>

<style>
	.page__header h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.page__header p {
		margin: 0.25rem 0 1rem;
		color: #8b98a8;
	}

	.list {
		display: grid;
		gap: 1rem;
	}

	.done {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(18, 24, 33, 0.7);
		color: #86efac;
	}

	.done p {
		margin: 0;
		color: #e8edf2;
	}

	.empty {
		padding: 2rem 1rem;
		text-align: center;
		border-radius: 1rem;
		background: #121821;
	}

	.empty a {
		color: #7dd3fc;
	}

	.error {
		color: #fca5a5;
		margin-top: 1rem;
	}

	.fab {
		position: fixed;
		right: 1rem;
		bottom: 5.5rem;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: #0284c7;
		color: white;
		text-decoration: none;
		font-size: 1.75rem;
		font-weight: 500;
		box-shadow: 0 10px 30px rgba(2, 132, 199, 0.35);
	}
</style>
