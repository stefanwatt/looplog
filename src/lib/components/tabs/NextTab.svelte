<script lang="ts">
	import { page } from '$app/state';
	import NextStackEmptyState from '$lib/components/NextStackEmptyState.svelte';
	import NextStack from '$lib/components/NextStack.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';

	const day = getDayStore();

	const stack = $derived.by(() => {
		const dateKey = page.url.searchParams.get('date') ?? day.todayDateKey;
		return day.nextStackFor({
			dateKey,
			focusHabitId: page.url.searchParams.get('habitId'),
			catchUp: page.url.searchParams.get('catchUp') === '1'
		});
	});

	const catchUpHref = $derived.by(() => {
		if (!stack.catchUpAvailable) return null;
		const params = new URLSearchParams({ catchUp: '1' });
		const date = page.url.searchParams.get('date');
		if (date) params.set('date', date);
		return `/next?${params.toString()}`;
	});

	let undoAvailable = $state(false);
	let doneCount = $state(0);
	let stackEmpty = $state(true);

	$effect.pre(() => {
		doneCount = stack.doneCount;
		stackEmpty = stack.upcomingHabits.length === 0;
	});
</script>

<svelte:head>
	<title>Next · Looplog</title>
</svelte:head>

<section class="flex h-[calc(100dvh-5.5rem-1rem)] flex-col overflow-hidden">
	<header class="shrink-0">
		<h1 class="m-0 text-2xl font-bold">Next</h1>
		<p class="mt-1 mb-3 text-subtext-0">
			{doneCount} / {stack.timedCount} timed habits done
		</p>
	</header>

	<NextStack
		upcomingHabits={stack.upcomingHabits}
		timezone={day.timezone}
		canSkip={stack.canSkip}
		initialDoneCount={stack.doneCount}
		dateKey={page.url.searchParams.get('date') ?? day.todayDateKey}
		bind:doneCount
		bind:undoAvailable
		bind:stackEmpty
	/>

	{#if stackEmpty && stack.upcomingHabits.length === 0}
		{#if stack.timedCount === 0}
			<NextStackEmptyState message="No timed habits for today.">
				{#snippet actions()}
					<a href="/habits/new" class="mt-3 text-blue">Create a habit</a>
				{/snippet}
			</NextStackEmptyState>
		{:else if catchUpHref}
			<NextStackEmptyState message="You have unlogged habits from earlier today.">
				{#snippet actions()}
					<a href={catchUpHref} class="mt-3 text-blue">View catch-up habits</a>
				{/snippet}
			</NextStackEmptyState>
		{:else}
			<NextStackEmptyState message="Nothing to log right now." />
		{/if}
	{/if}
</section>
