<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import {
		computeHabitHistory,
		computeHabitStats,
		formatDateKey,
		habitStatsStartDate,
		outcomeLabel,
		parseStatsWindow,
		statsWindowOptions,
		windowStartDate,
		type StatsWindow
	} from '$lib/habits/stats';
	import { habitTypeLabel } from '$lib/habits/service';
	import { mdiChevronLeft } from '@mdi/js';

	let { data } = $props();

	const window = $derived(parseStatsWindow(page.url.searchParams.get('window') ?? '30d') ?? '30d');

	const habitStart = $derived(habitStatsStartDate(data.habit, data.logs, data.timezone));

	const windowStats = $derived.by(() => {
		if (!habitStart) return null;
		const start = windowStartDate(data.todayDateKey, window, habitStart);
		return computeHabitStats(data.habit, data.logs, start, data.todayDateKey, data.timezone);
	});

	const historyEntries = $derived.by(() => {
		if (!habitStart) return [];
		const start = windowStartDate(data.todayDateKey, window, habitStart);
		return computeHabitHistory(data.habit, data.logs, start, data.todayDateKey, data.timezone);
	});

	const summary = $derived.by(() => {
		if (historyEntries.length === 0) return null;
		const logged = historyEntries.filter((entry) => entry.result.outcome === 'logged').length;
		const missed = historyEntries.filter((entry) => entry.result.outcome === 'missed').length;
		const skipped = historyEntries.filter((entry) => entry.result.outcome === 'skip').length;
		return { logged, missed, skipped, total: historyEntries.length };
	});

	function setWindow(nextWindow: StatsWindow) {
		if (nextWindow === window) return;
		const params = new URLSearchParams(page.url.searchParams);
		if (nextWindow === '30d') {
			params.delete('window');
		} else {
			params.set('window', nextWindow);
		}
		const qs = params.toString();
		void goto(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {
			keepFocus: true,
			noScroll: true,
			invalidateAll: false
		});
	}

	function outcomeClass(outcome: string): string {
		if (outcome === 'logged') return 'text-green';
		if (outcome === 'missed') return 'text-peach';
		return 'text-yellow';
	}
</script>

<svelte:head>
	<title>{data.habit.name} · History · Looplog</title>
</svelte:head>

<section class="grid gap-4 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
	<header>
		<a href="/stats" class="inline-flex items-center gap-1 text-blue no-underline">
			<Icon path={mdiChevronLeft} size={20} />
			Stats
		</a>
		<h1 class="mt-2 mb-0.5 text-2xl font-bold">{data.habit.name}</h1>
		<p class="m-0 text-subtext-0">{habitTypeLabel(data.habit.type)} · Log history</p>
	</header>

	<SegmentedToggle
		value={window}
		options={statsWindowOptions}
		ariaLabel="History window"
		onchange={(value) => setWindow(value as StatsWindow)}
	/>

	{#if windowStats && windowStats.eligibleDays > 0}
		<div class="grid grid-cols-2 gap-2">
			<div class="rounded-2xl bg-surface-0/40 px-4 py-3">
				<p class="m-0 text-xs tracking-wide text-subtext-0 uppercase">Avg adherence</p>
				<p class="mt-1 mb-0 text-2xl font-bold tabular-nums text-blue">
					{windowStats.adherence ?? '—'}%
				</p>
			</div>
			<div class="rounded-2xl bg-surface-0/40 px-4 py-3">
				<p class="m-0 text-xs tracking-wide text-subtext-0 uppercase">Completion</p>
				<p class="mt-1 mb-0 text-2xl font-bold tabular-nums text-blue">
					{windowStats.completion ?? '—'}%
				</p>
			</div>
		</div>
	{/if}

	{#if summary}
		<p class="m-0 text-sm text-subtext-0">
			{summary.logged} logged · {summary.missed} missed · {summary.skipped} skipped · {summary.total}
			scheduled days
		</p>
	{/if}

	{#if !habitStart}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center text-subtext-0">
			<p class="m-0">No logs yet for this habit.</p>
		</div>
	{:else if historyEntries.length === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center text-subtext-0">
			<p class="m-0">No scheduled days in this window.</p>
		</div>
	{:else}
		<div class="grid gap-2">
			{#each historyEntries as entry (entry.dateKey)}
				<article class="flex items-center justify-between rounded-2xl bg-surface-0/40 px-4 py-3">
					<div>
						<p class="m-0 font-semibold">{formatDateKey(entry.dateKey)}</p>
						<p class="mt-0.5 mb-0 text-xs text-subtext-0">{entry.dateKey}</p>
					</div>
					<span class="text-sm font-semibold {outcomeClass(entry.result.outcome)}">
						{outcomeLabel(entry.result)}
					</span>
				</article>
			{/each}
		</div>
	{/if}

	<a
		href="/habits/{data.habit.id}/edit"
		class="text-center text-sm text-blue no-underline"
	>
		Edit habit
	</a>
</section>
