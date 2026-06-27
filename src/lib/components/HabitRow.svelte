<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import { formatTimeLabel } from '$lib/habits/adherence';
	import { statusLabel } from '$lib/habits/service';

	let { habit, log }: { habit: Habit; log: HabitLog | null } = $props();
</script>

<article
	class="flex items-center justify-between gap-4 rounded-2xl border border-surface-0/40 bg-surface-0/40 px-4 py-4"
>
	<div>
		<p class="m-0 font-semibold">{habit.name}</p>
		<p class="mt-0.5 text-sm text-subtext-0">
			{#if habit.anchor_time}
				{formatTimeLabel(habit.anchor_time)}
			{:else}
				Anytime
			{/if}
		</p>
	</div>
	<span
		class="text-sm font-semibold whitespace-nowrap {log?.status === 'logged'
			? 'text-green'
			: log?.status === 'skipped'
				? 'text-yellow'
				: 'text-subtext-0'}"
	>
		{statusLabel(log)}
	</span>
</article>
