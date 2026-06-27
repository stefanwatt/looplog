<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import Icon from '$lib/components/Icon.svelte';
	import { formatTimeLabel } from '$lib/habits/adherence';
	import { statusLabel } from '$lib/habits/service';
	import { mdiChevronRight, mdiPencil } from '@mdi/js';

	let {
		habit,
		log,
		dateKey
	}: { habit: Habit; log: HabitLog | null; dateKey: string } = $props();

	const nextHref = $derived(
		`/next?habitId=${habit.id}${dateKey ? `&date=${dateKey}` : ''}`
	);
</script>

<article
	class="flex items-center justify-between gap-4 rounded-2xl border border-surface-0/40 bg-surface-0/40 px-4 py-4"
>
	<a
		href={nextHref}
		class="flex min-w-0 flex-1 items-center justify-between gap-4 no-underline text-inherit"
	>
		<div class="min-w-0">
			<p class="m-0 font-semibold">{habit.name}</p>
			<p class="mt-0.5 text-sm text-subtext-0">
				{#if habit.anchor_time}
					{formatTimeLabel(habit.anchor_time)}
				{:else}
					Anytime
				{/if}
			</p>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<span
				class="text-sm font-semibold whitespace-nowrap {log?.status === 'logged'
					? 'text-green'
					: log?.status === 'skipped'
						? 'text-yellow'
						: 'text-subtext-0'}"
			>
				{statusLabel(log)}
			</span>
			<Icon path={mdiChevronRight} size={20} class="text-subtext-0" />
		</div>
	</a>
	<a
		href="/habits/{habit.id}/edit"
		class="grid shrink-0 place-items-center text-subtext-0 no-underline"
		aria-label="Edit {habit.name}"
	>
		<Icon path={mdiPencil} size={18} />
	</a>
</article>
