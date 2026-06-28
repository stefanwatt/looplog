<script lang="ts">
	import { tick } from 'svelte';
	import type { HabitWithLog } from '$lib/database.types';
	import type { HabitLogPayload } from '$lib/habits/log-actions';
	import {
		canCheckHabit,
		canNailIt,
		checkForm,
		checkPayload,
		failForm,
		failPayload,
		nailedItForm,
		nailedItPayload,
		type HabitCardForm
	} from '$lib/habits/card-actions';
	import {
		CARD_ACTION_STAMPS,
		CARD_EXIT_MS,
		CARD_EXIT_SWIPE_PX,
		CARD_STAMP_HOLD_MS,
		cardStackBehindTransform,
		cardStackDragProgress,
		type CardActionStampType,
		wait
	} from '$lib/habits/card-action-animation';
	import HabitActionBar from '$lib/components/HabitActionBar.svelte';
	import FocusStackEmptyState from '$lib/components/FocusStackEmptyState.svelte';
	import HabitCardPlaceholder from '$lib/components/HabitCardPlaceholder.svelte';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { computeHabitCurrentStreak } from '$lib/habits/stats';

	type UndoEntry = {
		habit: HabitWithLog;
		form: HabitCardForm;
		canSkip: boolean;
	};

	let {
		habits,
		timezone,
		dateKey,
		canSkip = false,
		busy = false,
		undoAvailable = $bindable(false),
		onlog,
		onskip,
		onundo
	}: {
		habits: HabitWithLog[];
		timezone: string;
		dateKey: string;
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
	let stamp = $state<CardActionStampType | null>(null);
	let formPreview = $state<HabitCardForm | null>(null);
	let behindLayerEls = $state<Record<string, HTMLDivElement>>({});

	const displayHabits = $derived.by(() => {
		const restore = undoRestore;
		if (!restore) return habits;
		const rest = habits.filter((habit) => habit.id !== restore.habit.id);
		return [restore.habit, ...rest];
	});

	const currentHabit = $derived(displayHabits[0] ?? null);

	const day = getDayStore();

	function habitLogsForStreak(habitId: string) {
		const recent = day.recentLogsByHabit.get(habitId) ?? [];
		const viewed = day.logs.filter((log) => log.habit_id === habitId);
		const byDate = new Map<string, (typeof recent)[number]>();
		for (const log of [...recent, ...viewed]) {
			byDate.set(log.log_date, log);
		}
		return [...byDate.values()];
	}

	const currentStreak = $derived.by(() => {
		if (!currentHabit || currentHabit.type !== 'do_binary') return null;
		return computeHabitCurrentStreak(
			currentHabit,
			habitLogsForStreak(currentHabit.id),
			timezone,
			dateKey
		);
	});

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

	const dragProgress = $derived(cardStackDragProgress(dragX));
	const behindHabits = $derived(displayHabits.slice(1, 3));
	const stackPadding = $derived(behindHabits.length * PEEK_PX);

	function bindBehindLayer(node: HTMLDivElement, habitId: string) {
		behindLayerEls = { ...behindLayerEls, [habitId]: node };
		return {
			destroy() {
				const next = { ...behindLayerEls };
				delete next[habitId];
				behindLayerEls = next;
			}
		};
	}

	function behindTransform(depth: number, progress: number) {
		const effectiveDepth = depth - progress;
		const translateY = effectiveDepth * PEEK_PX;
		const scale = 1 - effectiveDepth * SCALE_STEP;
		return cardStackBehindTransform(translateY, scale);
	}

	function handleDragFrame(x: number) {
		const progress = cardStackDragProgress(x);
		for (let i = 0; i < behindHabits.length; i++) {
			const el = behindLayerEls[behindHabits[i].id];
			if (!el) continue;
			el.style.transform = behindTransform(i + 1, progress);
		}
	}

	function handleDragEnd() {
		const progress = cardStackDragProgress(dragX);
		for (let i = 0; i < behindHabits.length; i++) {
			const el = behindLayerEls[behindHabits[i].id];
			if (!el) continue;
			el.style.transform = behindTransform(i + 1, progress);
		}
	}

	const promoteBehindLayers = $derived(dragging || animating || dragProgress > 0);

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
		void runLogAnimation({
			stamp: 'failure',
			formPreview: failForm(currentHabit),
			complete: (habit) => onlog(habit, failPayload(habit))
		});
	}

	function handleCheck() {
		if (!currentHabit || busy || animating || !canCheck) return;
		void runLogAnimation({
			stamp: 'success',
			formPreview: checkForm(currentHabit, currentForm),
			complete: (habit) => onlog(habit, checkPayload(habit, currentForm))
		});
	}

	function handleNailedIt() {
		if (!currentHabit || busy || animating || !canNailItAction) return;
		void runLogAnimation({
			stamp: 'nailed-it',
			formPreview: nailedItForm(currentHabit, timezone),
			complete: (habit) => onlog(habit, nailedItPayload(habit, timezone))
		});
	}

	async function runLogAnimation({
		stamp: stampType,
		formPreview: preview,
		complete
	}: {
		stamp: CardActionStampType;
		formPreview: HabitCardForm;
		complete: (habit: HabitWithLog) => void;
	}) {
		if (!currentHabit) return;

		const config = CARD_ACTION_STAMPS[stampType];
		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm(),
			canSkip: currentCanSkip
		};

		animating = true;
		dragging = false;
		formPreview = preview;
		stamp = stampType;
		await tick();

		const holdMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : CARD_STAMP_HOLD_MS;
		await wait(holdMs);

		dragging = false;
		dragX = 0;
		await tick();

		dragX = config.exitDirection === 'right' ? CARD_EXIT_SWIPE_PX : -CARD_EXIT_SWIPE_PX;
		const exitMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : CARD_EXIT_MS;
		await wait(exitMs);

		lastDismissed = entry;
		undoRestore = null;
		complete(currentHabit);

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
						use:bindBehindLayer={habit.id}
						class="pointer-events-none absolute inset-0 origin-bottom"
						style:transform={dragging ? undefined : behindTransform(depth, dragProgress)}
						style:z-index={10 - depth}
						style:transition={dragging ? 'none' : 'transform 200ms ease-out'}
						style:will-change={promoteBehindLayers ? 'transform' : undefined}
					>
						{#if depth === 1}
							<SwipeHabitCard
								habit={habit}
								{timezone}
								hideLog
								fillHeight
								showEdit={false}
								interactive={false}
							/>
						{:else}
							<HabitCardPlaceholder />
						{/if}
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
							showEdit={false}
							{currentStreak}
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
							ondragframe={handleDragFrame}
							ondragend={handleDragEnd}
							onfail={handleFail}
							oncheck={handleCheck}
						/>
					{/key}
				</div>
			{:else}
				<FocusStackEmptyState message="Nothing else in focus right now." />
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
