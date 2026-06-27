<script lang="ts">
	import HabitCardStack from '$lib/components/HabitCardStack.svelte';
	import { logHabit, skipHabit, type HabitLogPayload } from '$lib/habits/log-actions';

	let { data } = $props();

	const currentHabit = $derived(data.upcomingHabits[0] ?? null);

	let busy = $state(false);
	let error = $state('');

	async function handleLog(payload: HabitLogPayload) {
		if (!currentHabit || busy) return;
		busy = true;
		error = '';

		try {
			await logHabit(currentHabit, data.dateKey, payload);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save log';
		} finally {
			busy = false;
		}
	}

	async function handleSkip() {
		if (!currentHabit || busy) return;
		busy = true;
		error = '';

		try {
			await skipHabit(currentHabit, data.dateKey);
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

<section class="flex h-[calc(100dvh-5.5rem-1rem)] flex-col overflow-hidden">
	<header class="shrink-0">
		<h1 class="m-0 text-2xl font-bold">Next</h1>
		<p class="mt-1 mb-3 text-subtext-0">
			{data.doneCount} / {data.timedCount} timed habits done
		</p>
	</header>

	{#if data.upcomingHabits.length > 0}
		{#key data.upcomingHabits[0].id}
			<div class="flex min-h-0 flex-1 flex-col">
				<HabitCardStack
					habits={data.upcomingHabits}
					timezone={data.timezone}
					canSkip={data.canSkip}
					{busy}
					onlog={handleLog}
					onskip={handleSkip}
				/>
			</div>
		{/key}
	{:else if data.timedCount === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No timed habits for today.</p>
			<a href="/habits/new" class="text-blue">Create a habit</a>
		</div>
	{:else if data.doneCount === data.timedCount}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">All timed habits are done for today.</p>
			<a href="/anytime" class="text-blue">Check anytime habits</a>
		</div>
	{:else}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">Nothing to log right now.</p>
			<a href="/today" class="text-blue">Check Today for earlier habits</a>
		</div>
	{/if}

	{#if error}
		<p class="mt-4 text-red">{error}</p>
	{/if}
</section>
