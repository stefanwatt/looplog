<script lang="ts">
	import StatsMetricCard from '$lib/components/StatsMetricCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getStatsStore } from '$lib/habits/stats.svelte';
	import {
		metricLabel,
		metricValue,
		type StatsMetric,
		type StatsWindow,
		windowLabel
	} from '$lib/habits/stats';
	import { mdiEmoticonHappyOutline, mdiEmoticonSadOutline } from '@mdi/js';

	const stats = getStatsStore();

	const windows: StatsWindow[] = ['7d', '30d', 'all'];

	const adherenceCards = $derived.by(() =>
		windows.map((window) => ({
			window,
			label: windowLabel(window),
			value: stats.snapshot ? metricValue(stats.snapshot, 'adherence', window) : null,
			href: `/stats/adherence/${window}`
		}))
	);

	const completionCards = $derived.by(() =>
		windows.map((window) => ({
			window,
			label: windowLabel(window),
			value: stats.snapshot ? metricValue(stats.snapshot, 'completion', window) : null,
			href: `/stats/completion/${window}`
		}))
	);

	const streakCards = $derived.by(() => [
		{
			metric: 'streak-current' as StatsMetric,
			label: 'Current',
			value: stats.snapshot?.currentStreak ?? null,
			href: '/stats/streak-current/all'
		},
		{
			metric: 'streak-best' as StatsMetric,
			label: 'Best',
			value: stats.snapshot?.bestStreak ?? null,
			href: '/stats/streak-best/all'
		}
	]);

	const rankings = $derived(stats.snapshot?.habitRankings ?? []);
	const bestHabits = $derived(rankings.filter((entry) => (entry.adherence ?? 0) >= 70).slice(0, 5));
	const strugglingHabits = $derived(
		[...rankings].reverse().filter((entry) => (entry.adherence ?? 100) < 70).slice(0, 5)
	);
</script>

<svelte:head>
	<title>Stats · Looplog</title>
</svelte:head>

<section
	class="flex min-h-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: stats-page"
>
	<header class="mb-4 shrink-0">
		<h1 class="m-0 text-2xl font-bold">Stats</h1>
		<p class="mt-1 mb-0 text-sm text-subtext-0">Adherence overview</p>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
	{#if stats.loading && !stats.snapshot}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-10 text-center text-subtext-0">Loading stats…</div>
	{:else if stats.error}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-10 text-center text-red">{stats.error}</div>
	{:else if !stats.snapshot?.trackingStart}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-10 text-center">
			<p class="m-0">Log your first habit to start tracking adherence.</p>
		</div>
	{:else}
		<div class="grid gap-5">
			<section>
				<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
					Avg adherence
				</h2>
				<div class="grid grid-cols-3 gap-2">
					{#each adherenceCards as card, index (card.window)}
						<StatsMetricCard
							label={card.label}
							metric="adherence"
							value={card.value}
							href={card.href}
							transitionName={index === 0 ? 'stats-metric-primary' : undefined}
						/>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
					Completion rate
				</h2>
				<div class="grid grid-cols-3 gap-2">
					{#each completionCards as card (card.window)}
						<StatsMetricCard
							label={card.label}
							metric="completion"
							value={card.value}
							href={card.href}
						/>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
					Streaks
				</h2>
				<div class="grid grid-cols-2 gap-2">
					{#each streakCards as card (card.metric)}
						<StatsMetricCard
							label={card.label}
							metric={card.metric}
							value={card.value}
							href={card.href}
						/>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="mt-0 mb-3 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
					Breakdown · 30 days
				</h2>

				{#if bestHabits.length > 0}
					<h3 class="mt-0 mb-2 flex items-center gap-1.5 text-sm font-semibold text-green">
						<Icon path={mdiEmoticonHappyOutline} size={18} />
						Doing well
					</h3>
					<div class="grid gap-2">
						{#each bestHabits as entry (entry.habit.id)}
							<a
								href="/habits/{entry.habit.id}/history"
								class="flex items-center justify-between rounded-2xl bg-surface-0/40 px-4 py-3 no-underline text-inherit transition active:bg-surface-0/60"
							>
								<div class="min-w-0">
									<p class="m-0 truncate font-semibold">{entry.habit.name}</p>
									<p class="mt-0.5 mb-0 text-xs text-subtext-0">
										{entry.completion ?? '—'}% completion
									</p>
								</div>
								<span class="text-lg font-bold tabular-nums text-green"
									>{entry.adherence ?? '—'}%</span
								>
							</a>
						{/each}
					</div>
				{/if}

				{#if strugglingHabits.length > 0}
					<h3
						class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-peach {bestHabits.length >
						0
							? 'mt-6'
							: 'mt-0'}"
					>
						<Icon path={mdiEmoticonSadOutline} size={18} />
						Needs attention
					</h3>
					<div class="grid gap-2">
						{#each strugglingHabits as entry (entry.habit.id)}
							<a
								href="/habits/{entry.habit.id}/history"
								class="block rounded-2xl border border-peach/20 bg-surface-0/40 px-4 py-3 no-underline text-inherit transition active:bg-surface-0/60"
							>
								<div class="flex items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="m-0 truncate font-semibold">{entry.habit.name}</p>
										<p class="mt-0.5 mb-0 text-xs text-subtext-0">
											{entry.completion ?? '—'}% completion
										</p>
									</div>
									<span class="text-lg font-bold tabular-nums text-peach"
										>{entry.adherence ?? '—'}%</span
									>
								</div>
								<p class="mt-2 mb-0 text-xs text-subtext-0">Tap to view log history</p>
							</a>
						{/each}
					</div>
				{/if}

				{#if rankings.length === 0}
					<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center text-subtext-0">
						No eligible habit days in the last 30 days.
					</div>
				{/if}
			</section>
		</div>
	{/if}
	</div>
</section>
