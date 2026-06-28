<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FocusStackEmptyState from '$lib/components/FocusStackEmptyState.svelte';
	import FocusStack from '$lib/components/FocusStack.svelte';
	import HabitFilterToggle from '$lib/components/HabitFilterToggle.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { parseHabitFilter, tabHref, type HabitFilter } from '$lib/habits/filter';

	const day = getDayStore();

	const dateKey = $derived(page.url.searchParams.get('date') ?? day.todayDateKey);
	const filter = $derived(parseHabitFilter(page.url.searchParams.get('filter')));

	const stack = $derived.by(() =>
		day.focusStackFor({
			dateKey,
			focusHabitId: page.url.searchParams.get('habitId'),
			catchUp: page.url.searchParams.get('catchUp') === '1',
			filter
		})
	);

	const catchUpHref = $derived.by(() => {
		if (!stack.catchUpAvailable) return null;
		return tabHref('/focus', {
			date: dateKey,
			filter,
			catchUp: true,
			todayDateKey: day.todayDateKey
		});
	});

	const progressLabel = $derived.by(() => {
		if (filter === 'timed') return 'timed habits done';
		if (filter === 'anytime') return 'anytime habits done';
		return 'habits done';
	});

	let undoAvailable = $state(false);
	let doneCount = $state(0);
	let stackEmpty = $state(true);

	$effect.pre(() => {
		doneCount = stack.doneCount;
		stackEmpty = stack.upcomingHabits.length === 0;
	});

	function setFilter(nextFilter: HabitFilter) {
		if (nextFilter === filter) return;
		goto(
			tabHref('/focus', {
				date: dateKey,
				filter: nextFilter,
				habitId: page.url.searchParams.get('habitId') ?? undefined,
				todayDateKey: day.todayDateKey
			}),
			{ invalidateAll: false, keepFocus: true, noScroll: true }
		);
	}
</script>

<svelte:head>
	<title>Focus · Looplog</title>
</svelte:head>

<section class="flex min-h-0 flex-1 flex-col overflow-hidden">
	<header class="shrink-0">
		<div class="mb-3 flex items-baseline justify-between gap-3">
			<h1 class="m-0 text-2xl font-bold">Focus</h1>
			<p class="m-0 text-subtext-0">
				{doneCount} / {stack.totalCount} {progressLabel}
			</p>
		</div>
		<div class="mb-3">
			<HabitFilterToggle value={filter} onchange={setFilter} />
		</div>
	</header>

	<FocusStack
		upcomingHabits={stack.upcomingHabits}
		timezone={day.timezone}
		canSkip={stack.canSkip}
		initialDoneCount={stack.doneCount}
		{dateKey}
		bind:doneCount
		bind:undoAvailable
		bind:stackEmpty
	/>

	{#if stackEmpty && stack.upcomingHabits.length === 0}
		{#if stack.totalCount === 0}
			<FocusStackEmptyState
				message={filter === 'anytime'
					? 'No anytime habits for today.'
					: filter === 'timed'
						? 'No timed habits for today.'
						: 'No habits for today.'}
			>
				{#snippet actions()}
					<a href="/habits/new" class="mt-3 text-blue">Create a habit</a>
				{/snippet}
			</FocusStackEmptyState>
		{:else if catchUpHref}
			<FocusStackEmptyState message="You have unlogged habits from earlier today.">
				{#snippet actions()}
					<a href={catchUpHref} class="mt-3 text-blue">View catch-up habits</a>
				{/snippet}
			</FocusStackEmptyState>
		{:else}
			<FocusStackEmptyState message="Nothing to log right now." />
		{/if}
	{/if}
</section>
