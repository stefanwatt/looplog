<script lang="ts">
	import type { DayBreakdown } from '$lib/habits/stats';
	import { formatDateKey, outcomeLabel } from '$lib/habits/stats';

	let {
		breakdown,
		showLink = true
	}: {
		breakdown: DayBreakdown;
		showLink?: boolean;
	} = $props();

	const missedEntries = $derived(
		breakdown.entries.filter((entry) => entry.result.outcome === 'missed')
	);
</script>

<section class="rounded-2xl bg-surface-0/40 px-4 py-3">
	<h3 class="mt-0 mb-2 text-sm font-semibold">{formatDateKey(breakdown.dateKey)}</h3>
	<p class="mt-0 mb-3 text-xs text-subtext-0">
		{#if breakdown.adherence != null}
			{breakdown.adherence}% adherence
		{/if}
		{#if breakdown.completion != null}
			{#if breakdown.adherence != null}
				·
			{/if}
			{breakdown.completion}% completion
		{/if}
		{#if breakdown.complete}
			· All habits complete
		{/if}
	</p>

	{#if missedEntries.length > 0}
		<p class="mt-0 mb-2 text-xs font-semibold tracking-wide text-peach uppercase">Missed</p>
		<ul class="m-0 grid list-none gap-2 p-0">
			{#each missedEntries as entry (entry.habit.id)}
				<li>
					{#if showLink}
						<a
							href="/habits/{entry.habit.id}/history"
							class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/30 px-3 py-2.5 no-underline text-inherit"
						>
							<span class="truncate font-semibold">{entry.habit.name}</span>
							<span class="shrink-0 text-sm text-peach">{outcomeLabel(entry.result)}</span>
						</a>
					{:else}
						<div class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/30 px-3 py-2.5">
							<span class="truncate font-semibold">{entry.habit.name}</span>
							<span class="shrink-0 text-sm text-peach">{outcomeLabel(entry.result)}</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if breakdown.entries.length > missedEntries.length}
		<p
			class="mb-2 text-xs font-semibold tracking-wide text-subtext-0 uppercase {missedEntries.length >
			0
				? 'mt-4'
				: 'mt-0'}"
		>
			Logged
		</p>
		<ul class="m-0 grid list-none gap-2 p-0">
			{#each breakdown.entries.filter((entry) => entry.result.outcome !== 'missed') as entry (entry.habit.id)}
				<li>
					{#if showLink}
						<a
							href="/habits/{entry.habit.id}/history"
							class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/30 px-3 py-2.5 no-underline text-inherit"
						>
							<span class="truncate font-semibold">{entry.habit.name}</span>
							<span
								class="shrink-0 text-sm {entry.result.outcome === 'logged'
									? 'text-green'
									: 'text-yellow'}"
							>
								{outcomeLabel(entry.result)}
							</span>
						</a>
					{:else}
						<div class="flex items-center justify-between gap-3 rounded-xl bg-surface-0/30 px-3 py-2.5">
							<span class="truncate font-semibold">{entry.habit.name}</span>
							<span
								class="shrink-0 text-sm {entry.result.outcome === 'logged'
									? 'text-green'
									: 'text-yellow'}"
							>
								{outcomeLabel(entry.result)}
							</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
