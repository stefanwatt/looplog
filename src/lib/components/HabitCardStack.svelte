<script lang="ts">
	import type { HabitWithLog } from '$lib/database.types';
	import type { HabitLogPayload } from '$lib/habits/log-actions';
	import {
		canCheckHabit,
		canNailIt,
		checkPayload,
		failPayload,
		nailedItPayload,
		type HabitCardForm
	} from '$lib/habits/card-actions';
	import HabitActionBar from '$lib/components/HabitActionBar.svelte';
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
		onskip
	}: {
		habits: HabitWithLog[];
		timezone: string;
		canSkip?: boolean;
		busy?: boolean;
		undoAvailable?: boolean;
		onlog: (habit: HabitWithLog, payload: HabitLogPayload) => Promise<void>;
		onskip?: (habit: HabitWithLog) => Promise<void>;
	} = $props();

	let dragX = $state(0);
	let dragging = $state(false);
	let lastDismissed = $state<UndoEntry | null>(null);
	let undoRestore = $state<UndoEntry | null>(null);

	let actualValue = $state<number | null>(null);
	let actualTime = $state('');
	let satisfaction = $state<number | null>(null);
	let touched = $state(false);

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

	async function handleFail() {
		if (!currentHabit || busy) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		await onlog(currentHabit, failPayload(currentHabit));
		lastDismissed = entry;
		undoRestore = null;
	}

	async function handleCheck() {
		if (!currentHabit || busy || !canCheck) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		await onlog(currentHabit, checkPayload(currentHabit, currentForm));
		lastDismissed = entry;
		undoRestore = null;
	}

	async function handleNailedIt() {
		if (!currentHabit || busy || !canNailItAction) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		await onlog(currentHabit, nailedItPayload(currentHabit, timezone));
		lastDismissed = entry;
		undoRestore = null;
	}

	async function handleSkip() {
		if (!currentHabit || busy || !currentCanSkip || !onskip) return;
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};
		await onskip(currentHabit);
		lastDismissed = entry;
		undoRestore = null;
	}

	function handleUndo() {
		if (!lastDismissed) return;
		undoRestore = lastDismissed;
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
							{busy}
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
			{/if}
		</div>

		<HabitActionBar
			{canUndo}
			canSkip={currentCanSkip}
			{canCheck}
			canNailIt={canNailItAction}
			{busy}
			onundo={handleUndo}
			onfail={handleFail}
			onnailedit={handleNailedIt}
			oncheck={handleCheck}
			onskip={handleSkip}
		/>
	</div>
{/if}
