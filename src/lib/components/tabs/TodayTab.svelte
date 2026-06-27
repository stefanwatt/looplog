<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import HabitRow from '$lib/components/HabitRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { shiftDateKey } from '$lib/habits/schedule';
	import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';

	const day = getDayStore();

	const viewDateKey = $derived(page.url.searchParams.get('date') ?? day.todayDateKey);
	const timedHabits = $derived(day.timedHabitsFor(viewDateKey));
	const prevDateKey = $derived(shiftDateKey(viewDateKey, -1));
	const nextDateKey = $derived(shiftDateKey(viewDateKey, 1));

	$effect(() => {
		day.setViewDateKey(viewDateKey);
		void day.ensureDateLoaded(viewDateKey);
	});

	function navigateDate(dateKey: string) {
		goto(`/today?date=${dateKey}`, { invalidateAll: false, keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Today · Looplog</title>
</svelte:head>

<section>
	<header class="mb-4 flex items-center justify-between gap-4">
		<h1 class="m-0 text-2xl font-bold">Today</h1>
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
	</header>

	{#if timedHabits.length === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No timed habits scheduled for this day.</p>
			<a href="/habits/new" class="text-blue">Create one</a>
		</div>
	{:else}
		<div class="grid gap-3">
			{#each timedHabits as habit (habit.id)}
				<HabitRow {habit} log={habit.log} dateKey={viewDateKey} />
			{/each}
		</div>
	{/if}
</section>
