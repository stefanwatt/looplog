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

	const carousel = $derived.by(() =>
		day.focusCarouselFor({
			dateKey,
			focusHabitId: page.url.searchParams.get('habitId'),
			filter
		})
	);

	const progressLabel = $derived.by(() => {
		if (filter === 'timed') return 'timed habits done';
		if (filter === 'anytime') return 'anytime habits done';
		return 'habits done';
	});

	$effect(() => {
		day.setViewDateKey(dateKey);
		void day.ensureDateLoaded(dateKey);
	});

	function setFilter(nextFilter: HabitFilter) {
		if (nextFilter === filter) return;
		goto(
			tabHref('/focus', {
				date: dateKey,
				filter: nextFilter,
				todayDateKey: day.todayDateKey
			}),
			{ invalidateAll: false, keepFocus: true, noScroll: true }
		);
	}

	function clearFocusHabitId() {
		if (!page.url.searchParams.get('habitId')) return;
		goto(
			tabHref('/focus', {
				date: dateKey,
				filter,
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
			<div class="text-right text-sm text-subtext-1">
				<p class="m-0 tabular-nums">{dateKey}</p>
				<p class="m-0 text-subtext-0">
					{carousel.doneCount} / {carousel.totalCount} {progressLabel}
				</p>
			</div>
		</div>
		<div class="mb-3">
			<HabitFilterToggle
				value={filter}
				pendingCounts={carousel.pendingCounts}
				onchange={setFilter}
			/>
		</div>
	</header>

	<FocusStack
		habits={carousel.habits}
		initialIndex={carousel.initialIndex}
		timezone={day.timezone}
		{dateKey}
		onnavigate={clearFocusHabitId}
	/>

	{#if carousel.habits.length === 0}
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
	{/if}
</section>
