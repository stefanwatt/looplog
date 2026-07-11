<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import StatsDayBreakdown from '$lib/components/StatsDayBreakdown.svelte';
	import type { StatsMetric, StatsSnapshot, StatsWindow } from '$lib/habits/stats';
	import {
		computeAdherenceImpact,
		computeBestStreakRun,
		computeCompletionImpact,
		computeDayBreakdown,
		computeStreakBreakInfo,
		formatDateKey,
		metricSeries,
		windowStartDate
	} from '$lib/habits/stats';

	let {
		metric,
		window,
		snapshot,
		habits,
		logs,
		timezone,
		selectedDateKey = null
	}: {
		metric: StatsMetric;
		window: StatsWindow;
		snapshot: StatsSnapshot;
		habits: Habit[];
		logs: HabitLog[];
		timezone: string;
		selectedDateKey?: string | null;
	} = $props();

	const trackingStart = $derived(snapshot.trackingStart);
	const series = $derived(metricSeries(snapshot, metric, window));
	const windowStart = $derived(
		trackingStart ? windowStartDate(snapshot.todayDateKey, window, trackingStart) : null
	);

	const selectedBreakdown = $derived.by(() => {
		if (!selectedDateKey || !trackingStart) return null;
		return computeDayBreakdown(habits, logs, selectedDateKey, timezone);
	});

	const streakBreak = $derived.by(() => {
		if (!trackingStart || metric !== 'streak-current' || snapshot.currentStreak !== 0) {
			return null;
		}
		return computeStreakBreakInfo(habits, logs, series, snapshot.todayDateKey, timezone);
	});

	const bestStreakRun = $derived.by(() => {
		if (!trackingStart || metric !== 'streak-best') return null;
		return computeBestStreakRun(habits, logs, series, timezone);
	});

	const adherenceImpacts = $derived.by(() => {
		if (!trackingStart || metric !== 'adherence' || !windowStart) return [];
		return computeAdherenceImpact(
			habits,
			logs,
			windowStart,
			snapshot.todayDateKey,
			timezone
		);
	});

	const completionImpacts = $derived.by(() => {
		if (!trackingStart || metric !== 'completion' || !windowStart) return [];
		return computeCompletionImpact(
			habits,
			logs,
			windowStart,
			snapshot.todayDateKey,
			timezone
		);
	});

	const hurtingHabits = $derived(
		(metric === 'adherence' ? adherenceImpacts : completionImpacts).slice(0, 5)
	);
	const helpingHabits = $derived(
		[...(metric === 'adherence' ? adherenceImpacts : completionImpacts)]
			.reverse()
			.filter((entry) => entry.dragPoints < 1)
			.slice(0, 5)
	);
</script>

<div class="mt-4 grid gap-4">
	{#if selectedBreakdown}
		<div>
			<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
				Selected day
			</h2>
			<StatsDayBreakdown breakdown={selectedBreakdown} />
		</div>
	{/if}

	{#if metric === 'streak-current'}
		<div>
			<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
				Streak break
			</h2>
			{#if snapshot.currentStreak > 0}
				<p class="m-0 rounded-2xl bg-surface-0/40 px-4 py-3 text-sm text-subtext-0">
					You're on a {snapshot.currentStreak}-day streak. Tap a day on the chart to inspect it.
				</p>
			{:else if streakBreak}
				<div class="rounded-2xl bg-surface-0/40 px-4 py-3">
					<p class="mt-0 mb-2 text-sm">
						Last break on <span class="font-semibold">{formatDateKey(streakBreak.dateKey)}</span>
					</p>
					<ul class="m-0 grid list-none gap-2 p-0">
						{#each streakBreak.missedHabits as habit (habit.id)}
							<li>
								<a
									href="/habits/{habit.id}/history"
									class="flex items-center justify-between rounded-xl bg-surface-0/30 px-3 py-2.5 no-underline text-inherit"
								>
									<span class="font-semibold">{habit.name}</span>
									<span class="text-sm text-peach">Missed</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="m-0 rounded-2xl bg-surface-0/40 px-4 py-3 text-sm text-subtext-0">
					No closed break day found yet.
				</p>
			{/if}
		</div>
	{:else if metric === 'streak-best' && bestStreakRun}
		<div>
			<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
				Best run
			</h2>
			<div class="rounded-2xl bg-surface-0/40 px-4 py-3 text-sm">
				<p class="mt-0 mb-2">
					<span class="font-semibold">{bestStreakRun.length} days</span>
					· {formatDateKey(bestStreakRun.startDateKey)} – {formatDateKey(bestStreakRun.endDateKey)}
				</p>
				{#if bestStreakRun.breakDateKey}
					<p class="mt-0 mb-2 text-subtext-0">
						Ended on {formatDateKey(bestStreakRun.breakDateKey)}
						{#if bestStreakRun.breakMissedHabits.length > 0}
							because you missed:
						{/if}
					</p>
					{#if bestStreakRun.breakMissedHabits.length > 0}
						<ul class="m-0 grid list-none gap-2 p-0">
							{#each bestStreakRun.breakMissedHabits as habit (habit.id)}
								<li>
									<a
										href="/habits/{habit.id}/history"
										class="flex items-center justify-between rounded-xl bg-surface-0/30 px-3 py-2.5 no-underline text-inherit"
									>
										<span class="font-semibold">{habit.name}</span>
										<span class="text-sm text-peach">Missed</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{:else}
					<p class="m-0 text-subtext-0">Still running — no break yet.</p>
				{/if}
			</div>
		</div>
	{:else if metric === 'adherence' || metric === 'completion'}
		<div>
			<h2 class="mt-0 mb-2 text-sm font-semibold tracking-wide text-subtext-0 uppercase">
				{metric === 'adherence' ? 'Adherence' : 'Completion'} impact
			</h2>
			{#if hurtingHabits.length > 0}
				<p class="mt-0 mb-2 text-xs font-semibold text-peach">Dragging average down</p>
				<ul class="m-0 mb-4 grid list-none gap-2 p-0">
					{#each hurtingHabits.filter((entry) => entry.dragPoints >= 1) as entry (entry.habit.id)}
						<li>
							<a
								href="/habits/{entry.habit.id}/history"
								class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/40 px-4 py-3 no-underline text-inherit"
							>
								<span class="truncate font-semibold">{entry.habit.name}</span>
								<span class="shrink-0 text-sm tabular-nums text-peach">
									−{Math.round(entry.dragPoints)} pts
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
			{#if helpingHabits.length > 0}
				<p class="mt-0 mb-2 text-xs font-semibold text-green">Keeping average up</p>
				<ul class="m-0 grid list-none gap-2 p-0">
					{#each helpingHabits as entry (entry.habit.id)}
						<li>
							<a
								href="/habits/{entry.habit.id}/history"
								class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/40 px-4 py-3 no-underline text-inherit"
							>
								<span class="truncate font-semibold">{entry.habit.name}</span>
								<span class="shrink-0 text-sm tabular-nums text-green">
									{entry.dragPoints <= 0 ? 'Strong' : `−${Math.round(entry.dragPoints)} pts drag`}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
			{#if hurtingHabits.filter((entry) => entry.dragPoints >= 1).length === 0 && helpingHabits.length === 0}
				<p class="m-0 rounded-2xl bg-surface-0/40 px-4 py-3 text-sm text-subtext-0">
					Not enough data in this window.
				</p>
			{/if}
		</div>
	{/if}
</div>
