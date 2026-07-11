<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DayCompleteCelebration from '$lib/components/DayCompleteCelebration.svelte';
	import FocusStackEmptyState from '$lib/components/FocusStackEmptyState.svelte';
	import FocusStack from '$lib/components/FocusStack.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';
	import {
		habitFilterOptions,
		parseHabitFilter,
		parseUnloggedOnly,
		tabHref,
		type HabitFilter
	} from '$lib/habits/filter';

	const day = getDayStore();

	let celebrating = $state(false);
	let celebrationKey = $state(0);

	const dateKey = $derived(page.url.searchParams.get('date') ?? day.todayDateKey);
	const filter = $derived(parseHabitFilter(page.url.searchParams.get('filter')));
	const unloggedOnly = $derived(
		parseUnloggedOnly(
			page.url.searchParams.get('unlogged'),
			page.url.searchParams.get('filter')
		)
	);

	const carousel = $derived.by(() =>
		day.focusCarouselFor({
			dateKey,
			focusHabitId: page.url.searchParams.get('habitId'),
			filter,
			unloggedOnly
		})
	);

	const progressLabel = $derived.by(() => {
		if (filter === 'timed') return 'timed habits done';
		if (filter === 'anytime') return 'anytime habits done';
		return 'habits done';
	});

	const emptyMessage = $derived.by(() => {
		if (unloggedOnly) {
			if (filter === 'timed') return 'All timed habits logged.';
			if (filter === 'anytime') return 'All anytime habits logged.';
			return 'All habits logged for today.';
		}
		if (filter === 'anytime') return 'No anytime habits for today.';
		if (filter === 'timed') return 'No timed habits for today.';
		return 'No habits for today.';
	});

	$effect(() => {
		day.setViewDateKey(dateKey);
		void day.ensureDateLoaded(dateKey);
	});

	function focusHref(options: { filter?: HabitFilter; unloggedOnly?: boolean; habitId?: string } = {}) {
		return tabHref('/focus', {
			date: dateKey,
			filter: options.filter ?? filter,
			unloggedOnly: options.unloggedOnly ?? unloggedOnly,
			habitId: options.habitId,
			todayDateKey: day.todayDateKey
		});
	}

	function setFilter(nextFilter: HabitFilter) {
		if (nextFilter === filter) return;
		goto(focusHref({ filter: nextFilter }), {
			invalidateAll: false,
			keepFocus: true,
			noScroll: true
		});
	}

	function setUnloggedOnly(next: boolean) {
		if (next === unloggedOnly) return;
		goto(focusHref({ unloggedOnly: next }), {
			invalidateAll: false,
			keepFocus: true,
			noScroll: true
		});
	}

	function clearFocusHabitId() {
		if (!page.url.searchParams.get('habitId')) return;
		goto(focusHref(), { invalidateAll: false, keepFocus: true, noScroll: true });
	}

	function handleAllComplete() {
		celebrating = true;
		celebrationKey += 1;
	}

	function endCelebration() {
		celebrating = false;
	}
</script>

<svelte:head>
	<title>Focus · Looplog</title>
</svelte:head>

<section class="flex min-h-0 flex-1 flex-col overflow-hidden">
	<header class="shrink-0">
		<div class="mb-3 flex items-center gap-3">
			<h1 class="m-0 shrink-0 text-2xl font-bold">Focus</h1>

			<div class="flex shrink-0 items-center gap-2 text-sm text-subtext-0">
				<button
					type="button"
					role="switch"
					aria-checked={unloggedOnly}
					aria-label="Show only unlogged habits"
					class="relative h-6 w-10 shrink-0 rounded-full transition {unloggedOnly
						? 'bg-blue/30'
						: 'bg-surface-0/60'}"
					onclick={() => setUnloggedOnly(!unloggedOnly)}
				>
					<span
						class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface-0 shadow-sm transition-transform {unloggedOnly
							? 'translate-x-4 bg-blue'
							: ''}"
					></span>
				</button>
				<span>Unlogged</span>
			</div>

			<div class="ml-auto text-right text-sm text-subtext-1">
				<p class="m-0 tabular-nums">{dateKey}</p>
				<p class="m-0 text-subtext-0">
					{carousel.doneCount} / {carousel.totalCount} {progressLabel}
				</p>
			</div>
		</div>
		<div class="mb-3">
			<SegmentedToggle
				value={filter}
				options={habitFilterOptions}
				badges={carousel.pendingCounts}
				ariaLabel="Habit filter"
				onchange={(nextFilter) => setFilter(nextFilter as HabitFilter)}
			/>
		</div>
	</header>

	<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
		<FocusStack
			habits={carousel.habits}
			initialIndex={carousel.initialIndex}
			timezone={day.timezone}
			{dateKey}
			onnavigate={clearFocusHabitId}
			onallcomplete={handleAllComplete}
		/>

		{#if celebrating}
			{#key celebrationKey}
				<DayCompleteCelebration onfinish={endCelebration} />
			{/key}
		{/if}
	</div>

	{#if carousel.habits.length === 0}
		<FocusStackEmptyState message={emptyMessage}>
			{#snippet actions()}
				<a href="/habits/new" class="mt-3 text-blue">Create a habit</a>
			{/snippet}
		</FocusStackEmptyState>
	{/if}
</section>
