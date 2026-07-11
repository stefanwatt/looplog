<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import StatsInsightPanel from '$lib/components/StatsInsightPanel.svelte';
	import StatsTrendChart from '$lib/components/StatsTrendChart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getStatsStore } from '$lib/habits/stats.svelte';
	import {
		formatMetricValue,
		metricLabel,
		metricSeries,
		metricValue,
		parseStatsMetric,
		parseStatsWindow,
		windowLabel
	} from '$lib/habits/stats';
	import { mdiClose } from '@mdi/js';

	const stats = getStatsStore();

	const metric = $derived(parseStatsMetric(page.params.metric ?? ''));
	const window = $derived(parseStatsWindow(page.params.window ?? ''));

	const snapshot = $derived(stats.snapshot);
	const value = $derived(
		snapshot && metric && window ? metricValue(snapshot, metric, window) : null
	);
	const series = $derived(
		snapshot && metric && window ? metricSeries(snapshot, metric, window) : []
	);

	let selectedDateKey = $state<string | null>(null);

	$effect(() => {
		page.params.metric;
		page.params.window;
		selectedDateKey = null;
	});

	const title = $derived.by(() => {
		if (!metric || !window) return 'Stats';
		return `${metricLabel(metric)} · ${windowLabel(window)}`;
	});

	function goBack() {
		void goto('/stats', { keepFocus: true, noScroll: true });
	}

	function toggleDate(dateKey: string) {
		selectedDateKey = selectedDateKey === dateKey ? null : dateKey;
	}
</script>

<svelte:head>
	<title>{title} · Looplog</title>
</svelte:head>

<section style="view-transition-name: stats-page">
	<header class="mb-4 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h1 class="m-0 text-2xl font-bold">{title}</h1>
			<p class="mt-1 mb-0 text-3xl font-bold tabular-nums text-blue">
				{metric ? formatMetricValue(metric, value) : '—'}
			</p>
		</div>
		<button
			type="button"
			class="grid size-10 shrink-0 place-items-center rounded-full border border-surface-0/50 bg-surface-0/40 text-subtext-0"
			aria-label="Back to stats overview"
			onclick={goBack}
		>
			<Icon path={mdiClose} size={22} />
		</button>
	</header>

	{#if !metric || !window}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center text-subtext-0">
			<p class="m-0">Unknown stat.</p>
			<button type="button" class="mt-3 text-blue" onclick={goBack}>Back to stats</button>
		</div>
	{:else if stats.loading && !snapshot}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-10 text-center text-subtext-0">Loading…</div>
	{:else if !snapshot?.trackingStart}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center text-subtext-0">
			<p class="m-0">Not enough data yet.</p>
		</div>
	{:else}
		<StatsTrendChart
			{metric}
			points={series}
			{selectedDateKey}
			transitionName="stats-metric-primary"
			onselect={toggleDate}
		/>

		<StatsInsightPanel
			{metric}
			{window}
			{snapshot}
			habits={stats.habits}
			logs={stats.logs}
			timezone={stats.timezone}
			{selectedDateKey}
		/>
	{/if}
</section>
