<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import Icon from '$lib/components/Icon.svelte';
	import { formatTimeLabel } from '$lib/habits/adherence';
	import { statusLabel } from '$lib/habits/service';
	import { mdiPencil } from '@mdi/js';

	let { habit, log }: { habit: Habit; log: HabitLog | null } = $props();
</script>

<article
	class="flex items-center justify-between gap-4 rounded-2xl border border-surface-0/40 bg-surface-0/40 px-4 py-4"
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
	<div class="flex shrink-0 items-center gap-3">
		<span
			class="text-sm font-semibold whitespace-nowrap {log?.status === 'logged'
				? 'text-green'
				: log?.status === 'skipped'
					? 'text-yellow'
					: 'text-subtext-0'}"
		>
			{statusLabel(log)}
		</span>
		<a
			href="/habits/{habit.id}/edit"
			class="grid place-items-center text-subtext-0 no-underline"
			aria-label="Edit {habit.name}"
		>
			<Icon path={mdiPencil} size={18} />
		</a>
	</div>
</article>
