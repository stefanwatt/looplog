<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import { upsertLog } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';

	let { data } = $props();

	let busy = $state(false);
	let error = $state('');

	async function handleLog(payload: Record<string, unknown>) {
		if (!data.nextHabit || busy) return;
		busy = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, data.nextHabit, data.dateKey, {
				status: 'logged',
				actualValue: payload.actualValue as number | undefined,
				actualTime: payload.actualTime as string | undefined,
				satisfaction: payload.satisfaction as number | undefined
			});

			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save log';
		} finally {
			busy = false;
		}
	}

	async function handleSkip() {
		if (!data.nextHabit || busy) return;
		busy = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, data.nextHabit, data.dateKey, { status: 'skipped' });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not skip habit';
		} finally {
			busy = false;
		}
	}

</script>

<svelte:head>
	<title>Next · Looplog</title>
</svelte:head>

<section class="page">
	<header class="page__header">
		<h1>Next</h1>
		<p>{data.doneCount} / {data.timedCount} timed habits done</p>
	</header>

	{#if data.nextHabit}
		{#key data.nextHabit.id}
			<SwipeHabitCard
				habit={data.nextHabit}
				timezone={data.timezone}
				canSkip={data.canSkip}
				{busy}
				onlog={handleLog}
				onskip={handleSkip}
			/>
		{/key}
	{:else if data.timedCount === 0}
		<div class="empty">
			<p>No timed habits for today.</p>
			<a href="/habits/new">Create a habit</a>
		</div>
	{:else}
		<div class="empty">
			<p>All timed habits are done for today.</p>
			<a href="/anytime">Check anytime habits</a>
		</div>
	{/if}

	{#if error}
		<p class="error">{error}</p>
	{/if}
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
</style>
