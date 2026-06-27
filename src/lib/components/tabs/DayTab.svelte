<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import HabitFilterToggle from '$lib/components/HabitFilterToggle.svelte';
	import HabitRow from '$lib/components/HabitRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { parseHabitFilter, tabHref, type HabitFilter } from '$lib/habits/filter';
	import { shiftDateKey } from '$lib/habits/schedule';
	import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';

	const day = getDayStore();

	const viewDateKey = $derived(page.url.searchParams.get('date') ?? day.todayDateKey);
	const filter = $derived(parseHabitFilter(page.url.searchParams.get('filter')));
	const timedHabits = $derived(day.timedHabitsFor(viewDateKey));
	const anytimeHabits = $derived(day.anytimeHabitsFor(viewDateKey));
	const prevDateKey = $derived(shiftDateKey(viewDateKey, -1));
	const nextDateKey = $derived(shiftDateKey(viewDateKey, 1));
	const showTimed = $derived(filter === 'all' || filter === 'timed');
	const showAnytime = $derived(filter === 'all' || filter === 'anytime');
	const showTimedHeading = $derived(
		filter === 'all' && timedHabits.length > 0 && anytimeHabits.length > 0
	);
	const showAnytimeHeading = $derived(
		filter === 'all' && anytimeHabits.length > 0 && timedHabits.length > 0
	);

	$effect(() => {
		day.setViewDateKey(viewDateKey);
		void day.ensureDateLoaded(viewDateKey);
	});

	function navigateDate(dateKey: string) {
		goto(tabHref('/day', { date: dateKey, filter, todayDateKey: day.todayDateKey }), {
			invalidateAll: false,
			keepFocus: true,
			noScroll: true
		});
	}

	function setFilter(nextFilter: HabitFilter) {
		if (nextFilter === filter) return;
		goto(tabHref('/day', { date: viewDateKey, filter: nextFilter, todayDateKey: day.todayDateKey }), {
			invalidateAll: false,
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head>
	<title>Day · Looplog</title>
</svelte:head>

<section>
	<header class="mb-4">
		<div class="flex items-center justify-between gap-4">
			<h1 class="m-0 text-2xl font-bold">Day</h1>
			<div class="flex items-center gap-3 text-sm text-subtext-1">
				<button
					type="button"
					aria-label="Previous day"
					class="text-blue"
					onclick={() => navigateDate(prevDateKey)}
				>
					<Icon path={mdiChevronLeft} size={22} />
				</button>
				<span>{viewDateKey}</span>
				<button
					type="button"
					aria-label="Next day"
					class="text-blue"
					onclick={() => navigateDate(nextDateKey)}
				>
					<Icon path={mdiChevronRight} size={22} />
				</button>
			</div>
		</div>

		<div class="mt-4">
			<HabitFilterToggle value={filter} onchange={setFilter} />
		</div>
	</header>

	{#if showTimed}
		{#if showTimedHeading}
			<h2 class="mt-0 mb-3 text-sm font-semibold tracking-wide text-subtext-0 uppercase">Timed</h2>
		{/if}

		{#if timedHabits.length === 0}
			{#if filter === 'timed'}
				<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
					<p class="m-0">No timed habits scheduled for this day.</p>
					<a href="/habits/new" class="text-blue">Create one</a>
				</div>
			{/if}
		{:else}
			<div class="grid gap-3">
				{#each timedHabits as habit (habit.id)}
					<HabitRow {habit} log={habit.log} dateKey={viewDateKey} />
				{/each}
			</div>
		{/if}
	{/if}

	{#if showAnytime}
		{#if showAnytimeHeading}
			<h2
				class="mb-3 text-sm font-semibold tracking-wide text-subtext-0 uppercase {showTimed &&
				timedHabits.length > 0
					? 'mt-8'
					: 'mt-0'}"
			>
				Anytime
			</h2>
		{/if}

		{#if anytimeHabits.length === 0}
			{#if filter === 'anytime'}
				<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
					<p class="m-0">No anytime habits for this day.</p>
					<a href="/habits/new" class="text-blue">Create one</a>
				</div>
			{/if}
		{:else}
			<div class="grid gap-3 {showTimed && timedHabits.length > 0 ? 'mt-0' : ''}">
				{#each anytimeHabits as habit (habit.id)}
					<HabitRow {habit} log={habit.log} dateKey={viewDateKey} />
				{/each}
			</div>
		{/if}
	{/if}

	{#if filter === 'all' && timedHabits.length === 0 && anytimeHabits.length === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No habits scheduled for this day.</p>
			<a href="/habits/new" class="text-blue">Create one</a>
		</div>
	{/if}
</section>
