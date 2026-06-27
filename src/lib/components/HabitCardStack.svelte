<script lang="ts">
	import { tick } from 'svelte';
	import type { HabitWithLog } from '$lib/database.types';
	import type { HabitLogPayload } from '$lib/habits/log-actions';
	import {
		canCheckHabit,
		canNailIt,
		checkPayload,
		failPayload,
		nailedItForm,
		nailedItPayload,
		type HabitCardForm
	} from '$lib/habits/card-actions';
	import {
		CARD_EXIT_MS,
		CARD_EXIT_SWIPE_PX,
		CARD_STAMP_HOLD_MS,
		wait
	} from '$lib/habits/card-action-animation';
	import HabitActionBar from '$lib/components/HabitActionBar.svelte';
	import NextStackEmptyState from '$lib/components/NextStackEmptyState.svelte';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';

	type UndoEntry = {
		habit: HabitWithLog;
		form: HabitCardForm;
		canSkip: boolean;
	};

	let {
		habits,
		timezone,
		canSkip = false,
		busy = false,
		undoAvailable = $bindable(false),
		onlog,
		onskip,
		onundo
	}: {
		habits: HabitWithLog[];
		timezone: string;
		canSkip?: boolean;
		busy?: boolean;
		undoAvailable?: boolean;
		onlog: (habit: HabitWithLog, payload: HabitLogPayload) => void;
		onskip?: (habit: HabitWithLog) => void;
		onundo?: (habit: HabitWithLog) => void;
	} = $props();

	let dragX = $state(0);
	let dragging = $state(false);
	let lastDismissed = $state<UndoEntry | null>(null);
	let undoRestore = $state<UndoEntry | null>(null);

	let actualValue = $state<number | null>(null);
	let actualTime = $state('');
	let satisfaction = $state<number | null>(null);
	let touched = $state(false);
	let animating = $state(false);
	let stamp = $state<'nailed-it' | null>(null);
	let formPreview = $state<HabitCardForm | null>(null);

	const displayHabits = $derived.by(() => {
		const restore = undoRestore;
		if (!restore) return habits;
		const rest = habits.filter((habit) => habit.id !== restore.habit.id);
		return [restore.habit, ...rest];
	});

	const currentHabit = $derived(displayHabits[0] ?? null);

	const currentForm = $derived<HabitCardForm>({
		actualValue,
		actualTime,
		satisfaction,
		touched
	});

	const currentCanSkip = $derived.by(() => {
		if (!currentHabit) return false;
		if (undoRestore?.habit.id === currentHabit.id) return undoRestore.canSkip;
		if (currentHabit.id === habits[0]?.id) return canSkip;
		return currentHabit.allow_skip;
	});

	const canCheck = $derived(currentHabit ? canCheckHabit(currentHabit, currentForm) : false);
	const canNailItAction = $derived(currentHabit ? canNailIt(currentHabit) : false);
	const canUndo = $derived(lastDismissed != null);

	$effect(() => {
		undoAvailable = canUndo;
	});

	$effect(() => {
		currentHabit?.id;
		dragX = 0;
		dragging = false;
	});

	const cardInitialForm = $derived(
		undoRestore?.habit.id === currentHabit?.id ? undoRestore.form : null
	);

	const PEEK_PX = 16;
	const SCALE_STEP = 0.05;

	const dragProgress = $derived(Math.min(Math.abs(dragX) / 160, 1));
	const behindHabits = $derived(displayHabits.slice(1, 3));
	const stackPadding = $derived(behindHabits.length * PEEK_PX);

	function behindTransform(depth: number, progress: number) {
		const effectiveDepth = depth - progress;
		const translateY = effectiveDepth * PEEK_PX;
		const scale = 1 - effectiveDepth * SCALE_STEP;
		return `translateY(${translateY}px) scale(${scale})`;
	}

	function snapshotForm(): HabitCardForm {
		return {
			actualValue,
			actualTime,
			satisfaction,
			touched
		};
	}

	function handleFail() {
		if (!currentHabit || busy || animating) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		lastDismissed = entry;
		undoRestore = null;
		onlog(currentHabit, failPayload(currentHabit));
	}

	function handleCheck() {
		if (!currentHabit || busy || animating || !canCheck) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		lastDismissed = entry;
		undoRestore = null;
		onlog(currentHabit, checkPayload(currentHabit, currentForm));
	}

	function handleNailedIt() {
		if (!currentHabit || busy || animating || !canNailItAction) return;
		void runNailedItAnimation();
	}

	async function runNailedItAnimation() {
		if (!currentHabit) return;

		animating = true;
		dragging = false;

		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};

		formPreview = nailedItForm(currentHabit, timezone);
		stamp = 'nailed-it';
		await tick();

		const holdMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : CARD_STAMP_HOLD_MS;
		await wait(holdMs);

		dragging = false;
		dragX = 0;
		await tick();

		dragX = CARD_EXIT_SWIPE_PX;
		const exitMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : CARD_EXIT_MS;
		await wait(exitMs);

		lastDismissed = entry;
		undoRestore = null;
		onlog(currentHabit, nailedItPayload(currentHabit, timezone));

		stamp = null;
		formPreview = null;
		animating = false;
	}

	function handleSkip() {
		if (!currentHabit || busy || animating || !currentCanSkip || !onskip) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		lastDismissed = entry;
		undoRestore = null;
		onskip(currentHabit);
	}

	function handleUndo() {
		if (!lastDismissed) return;
		undoRestore = lastDismissed;
		onundo?.(lastDismissed.habit);
		lastDismissed = null;
	}
</script>

{#if currentHabit || canUndo}
	<div class="flex h-full min-h-0 flex-col">
		<div class="relative min-h-0 flex-1" style:margin-bottom={currentHabit ? `${stackPadding}px` : undefined}>
			{#if currentHabit}
				{#each behindHabits as habit, i (habit.id)}
					{@const depth = i + 1}
					<div
						class="pointer-events-none absolute inset-0 origin-bottom"
						style:transform={behindTransform(depth, dragProgress)}
						style:z-index={10 - depth}
						style:transition={dragging ? 'none' : 'transform 200ms ease-out'}
					>
						<SwipeHabitCard habit={habit} {timezone} hideLog fillHeight interactive={false} />
					</div>
				{/each}

				<div class="relative z-10 h-full min-h-0">
					{#key `${currentHabit.id}-${undoRestore?.habit.id === currentHabit.id ? 'undo' : 'live'}`}
						<SwipeHabitCard
							habit={currentHabit}
							{timezone}
							hideLog
							initialForm={cardInitialForm}
							fillHeight
							busy={busy || animating}
							interactive={!animating}
							{stamp}
							{formPreview}
							bind:dragX
							bind:dragging
							bind:actualValue
							bind:actualTime
							bind:satisfaction
							bind:touched
							onfail={handleFail}
							oncheck={handleCheck}
						/>
					{/key}
				</div>
			{:else}
				<NextStackEmptyState message="Nothing else up next right now." />
			{/if}
		</div>

		<HabitActionBar
			{canUndo}
			canSkip={currentCanSkip}
			{canCheck}
			canNailIt={canNailItAction}
			busy={busy || animating}
			onundo={handleUndo}
			onfail={handleFail}
			onnailedit={handleNailedIt}
			oncheck={handleCheck}
			onskip={handleSkip}
		/>
	</div>
{/if}
