<script lang="ts">
	import HabitRow from '$lib/components/HabitRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { mdiChevronLeft, mdiChevronRight, mdiPlus } from '@mdi/js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Today · Looplog</title>
</svelte:head>

<section>
	<header class="mb-4 flex items-center justify-between gap-4">
		<h1 class="m-0 text-2xl font-bold">Today</h1>
		<div class="flex items-center gap-3 text-sm text-subtext-1">
			<a href="/today?date={data.prevDateKey}" aria-label="Previous day" class="text-blue">
				<Icon path={mdiChevronLeft} size={22} />
			</a>
			<span>{data.dateKey}</span>
			<a href="/today?date={data.nextDateKey}" aria-label="Next day" class="text-blue">
				<Icon path={mdiChevronRight} size={22} />
			</a>
		</div>
	</header>

	{#if data.timedHabits.length === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No timed habits scheduled for this day.</p>
			<a href="/habits/new" class="text-blue">Create one</a>
		</div>
	{:else}
		<div class="grid gap-3">
			{#each data.timedHabits as habit (habit.id)}
				<HabitRow {habit} log={habit.log} />
			{/each}
		</div>
	{/if}

	<a
		class="fixed right-4 bottom-[5.5rem] grid size-[3.25rem] place-items-center rounded-full bg-blue text-crust no-underline shadow-lg shadow-blue/35"
		href="/habits/new"
		aria-label="Create habit"
	>
		<Icon path={mdiPlus} size={28} />
	</a>
</section>
