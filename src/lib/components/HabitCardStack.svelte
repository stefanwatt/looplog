<script lang="ts">
	import type { Habit } from '$lib/database.types';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';

	let {
		habits,
		timezone,
		onlog,
		onskip,
		canSkip = false,
		busy = false
	}: {
		habits: Habit[];
		timezone: string;
		onlog: (payload: Record<string, unknown>) => Promise<void>;
		onskip?: () => Promise<void>;
		canSkip?: boolean;
		busy?: boolean;
	} = $props();

	let dragX = $state(0);
	let dragging = $state(false);

	const PEEK_PX = 16;
	const SCALE_STEP = 0.05;

	const dragProgress = $derived(Math.min(Math.abs(dragX) / 160, 1));
	const behindHabits = $derived(habits.slice(1, 3));
	const stackPadding = $derived(behindHabits.length * PEEK_PX);

	function behindTransform(depth: number, progress: number) {
		const effectiveDepth = depth - progress;
		const translateY = effectiveDepth * PEEK_PX;
		const scale = 1 - effectiveDepth * SCALE_STEP;
		return `translateY(${translateY}px) scale(${scale})`;
	}
</script>

<div class="relative" style:margin-bottom="{stackPadding}px">
	{#each behindHabits as habit, i (habit.id)}
		{@const depth = i + 1}
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 origin-bottom"
			style:transform={behindTransform(depth, dragProgress)}
			style:z-index={10 - depth}
			style:transition={dragging ? 'none' : 'transform 200ms ease-out'}
		>
			<SwipeHabitCard habit={habit} {timezone} interactive={false} />
		</div>
	{/each}

	<div class="relative z-10">
		<SwipeHabitCard
			habit={habits[0]}
			{timezone}
			{canSkip}
			{busy}
			{onlog}
			{onskip}
			bind:dragX
			bind:dragging
		/>
	</div>
</div>
