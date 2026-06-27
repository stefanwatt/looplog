<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import { formatTimeLabel } from '$lib/habits/adherence';
	import { statusLabel } from '$lib/habits/service';

	let { habit, log }: { habit: Habit; log: HabitLog | null } = $props();
</script>

<article class="row">
	<div class="row__main">
		<p class="row__name">{habit.name}</p>
		<p class="row__meta">
			{#if habit.anchor_time}
				{formatTimeLabel(habit.anchor_time)}
			{:else}
				Anytime
			{/if}
		</p>
	</div>
	<span
		class="row__status"
		class:row__status--done={log?.status === 'logged'}
		class:row__status--skipped={log?.status === 'skipped'}
	>
		{statusLabel(log)}
	</span>
</article>

<style>
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-radius: 1rem;
		background: #121821;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.row__name {
		margin: 0;
		font-weight: 600;
	}

	.row__meta {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		color: #8b98a8;
	}

	.row__status {
		font-size: 0.85rem;
		font-weight: 600;
		color: #8b98a8;
		white-space: nowrap;
	}

	.row__status--done {
		color: #86efac;
	}

	.row__status--skipped {
		color: #fcd34d;
	}
</style>
