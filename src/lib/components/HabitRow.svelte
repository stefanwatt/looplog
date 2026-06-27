<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import Icon from '$lib/components/Icon.svelte';
	import { formatTimeLabel } from '$lib/habits/adherence';
	import { resetHabitLog } from '$lib/habits/log-actions';
	import { statusLabel } from '$lib/habits/service';
	import { mdiChevronRight, mdiPencil, mdiRefresh } from '@mdi/js';

	let {
		habit,
		log,
		dateKey
	}: { habit: Habit; log: HabitLog | null; dateKey: string } = $props();

	let resetting = $state(false);

	const nextHref = $derived(
		`/next?habitId=${habit.id}${dateKey ? `&date=${dateKey}` : ''}`
	);
	const canReset = $derived(log != null);

	const actionButtonClass =
		'grid min-h-12 place-items-center text-subtext-0 no-underline transition enabled:active:bg-surface-0/30 disabled:cursor-not-allowed disabled:opacity-35';

	async function handleReset() {
		if (!canReset || resetting) return;
		resetting = true;

		try {
			await resetHabitLog(habit.id, dateKey);
		} finally {
			resetting = false;
		}
	}
</script>

<article class="overflow-hidden rounded-2xl border border-surface-0/40 bg-surface-0/40">
	<a
		href={nextHref}
		class="flex items-center justify-between gap-4 px-4 py-4 no-underline text-inherit"
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

	<div
		class="grid grid-cols-2 border-t border-surface-0/50 bg-surface-0/20"
		role="toolbar"
		aria-label="{habit.name} actions"
	>
		<a
			href="/habits/{habit.id}/edit"
			class="{actionButtonClass} border-r border-surface-0/50"
			aria-label="Edit {habit.name}"
		>
			<Icon path={mdiPencil} size={22} />
		</a>
		<button
			type="button"
			class={actionButtonClass}
			disabled={!canReset || resetting}
			aria-label="Reset log for {habit.name}"
			onclick={handleReset}
		>
			<Icon path={mdiRefresh} size={22} />
		</button>
	</div>
</article>
