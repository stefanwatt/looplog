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
		CARD_STAMP_HOLD_MS,
		type CardActionStampType,
		prefersSimpleCardMotion,
		wait
	} from '$lib/habits/card-action-animation';
	import HabitActionBar from '$lib/components/HabitActionBar.svelte';
	import HabitCardPlaceholder from '$lib/components/HabitCardPlaceholder.svelte';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { computeHabitCurrentStreak } from '$lib/habits/stats';

	type UndoEntry = {
		habit: HabitWithLog;
		form: HabitCardForm;
	};

	let {
		habits,
		initialIndex = 0,
		timezone,
		dateKey,
		busy = false,
		onnavigate,
		onlog,
		onskip,
		onundo
	}: {
		habits: HabitWithLog[];
		initialIndex?: number;
		timezone: string;
		dateKey: string;
		busy?: boolean;
		onnavigate?: () => void;
		onlog: (habit: HabitWithLog, payload: HabitLogPayload) => void;
		onskip?: (habit: HabitWithLog) => void;
		onundo?: (habit: HabitWithLog) => void;
	} = $props();

	let currentIndex = $state(0);
	let emblaApi = $state<CarouselAPI | undefined>();
	let lastLogged = $state<UndoEntry | null>(null);
	let undoRestore = $state<UndoEntry | null>(null);

	let actualValue = $state<number | null>(null);
	let actualTime = $state('');
	let satisfaction = $state<number | null>(null);
	let touched = $state(false);
	let animating = $state(false);
	let stamp = $state<CardActionStampType | null>(null);
	let formPreview = $state<HabitCardForm | null>(null);

	let dragAllowed = true;

	const day = getDayStore();

	const carouselResetKey = $derived(
		`${habits.map((habit) => habit.id).join('|')}#${initialIndex}`
	);
	const startIndex = $derived(Math.min(initialIndex, Math.max(habits.length - 1, 0)));
	const habitCount = $derived(habits.length);
	const currentHabit = $derived(habits[currentIndex] ?? null);

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
		return day.canSkipHabit(currentHabit, dateKey);
	});

	const canCheck = $derived(currentHabit ? canCheckHabit(currentHabit, currentForm) : false);
	const canNailItAction = $derived(currentHabit ? canNailIt(currentHabit) : false);
	const hasExistingLog = $derived(currentHabit?.log?.status === 'logged');
	const canUndo = $derived(lastLogged != null);
	const carouselBusy = $derived(busy || animating);

	const renderedIndices = $derived.by(() => {
		if (habitCount <= 1) return new Set([currentIndex]);
		const prev = (currentIndex - 1 + habitCount) % habitCount;
		const next = (currentIndex + 1) % habitCount;
		return new Set([prev, currentIndex, next]);
	});

	const cardInitialForm = $derived(
		undoRestore?.habit.id === currentHabit?.id ? undoRestore.form : null
	);

	$effect(() => {
		carouselResetKey;
		emblaApi = undefined;
		currentIndex = startIndex;
	});

	$effect(() => {
		dragAllowed = !carouselBusy;
	});

	function snapshotForm(): HabitCardForm {
		return {
			actualValue,
			actualTime,
			satisfaction,
			touched
		};
	}

	function handleEmblaSelect() {
		if (!emblaApi) return;

		const nextIndex = emblaApi.selectedScrollSnap();
		if (nextIndex === currentIndex) return;

		currentIndex = nextIndex;
		undoRestore = null;
		onnavigate?.();
	}

	function handleEmblaSettle() {
		promoteEmblaLayer(false);
	}

	function handleEmblaInit(api: CarouselAPI | undefined) {
		emblaApi = api;
		if (!api) return;
		currentIndex = api.selectedScrollSnap();
	}

	function promoteEmblaLayer(active: boolean) {
		const container = emblaApi?.containerNode();
		if (!container) return;
		if (active) {
			container.style.willChange = 'transform';
			container.style.backfaceVisibility = 'hidden';
			return;
		}
		container.style.removeProperty('will-change');
		container.style.removeProperty('backface-visibility');
	}

	$effect(() => {
		if (!emblaApi) return;

		const onScroll = () => promoteEmblaLayer(true);

		emblaApi.on('scroll', onScroll);
		emblaApi.on('select', handleEmblaSelect);
		emblaApi.on('settle', handleEmblaSettle);

		return () => {
			emblaApi?.off('scroll', onScroll);
			emblaApi?.off('select', handleEmblaSelect);
			emblaApi?.off('settle', handleEmblaSettle);
			promoteEmblaLayer(false);
		};
	});

	function handleFail() {
		if (!currentHabit || carouselBusy) return;
		void runLogAnimation({
			stamp: 'failure',
			formPreview: failForm(currentHabit),
			complete: (habit) => onlog(habit, failPayload(habit))
		});
	}

	function handleCheck() {
		if (!currentHabit || carouselBusy || !canCheck) return;
		void runLogAnimation({
			stamp: 'success',
			formPreview: checkForm(currentHabit, currentForm),
			complete: (habit) => onlog(habit, checkPayload(habit, currentForm))
		});
	}

	function handleNailedIt() {
		if (!currentHabit || carouselBusy || !canNailItAction) return;
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

		const entry: UndoEntry = {
			habit: currentHabit,
			form: snapshotForm()
		};

		animating = true;
		formPreview = preview;
		stamp = stampType;
		await tick();

		const holdMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : CARD_STAMP_HOLD_MS;
		await wait(holdMs);

		lastLogged = entry;
		undoRestore = null;
		complete(currentHabit);

		stamp = null;
		formPreview = null;
		animating = false;
	}

	function handleSkip() {
		if (!currentHabit || carouselBusy || !currentCanSkip || !onskip) return;
		lastLogged = {
			habit: currentHabit,
			form: snapshotForm()
		};
		undoRestore = null;
		onskip(currentHabit);
	}

	function handleUndo() {
		if (!lastLogged) return;
		undoRestore = lastLogged;
		onundo?.(lastLogged.habit);
		lastLogged = null;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	{#key carouselResetKey}
		<Carousel.Root
			class="min-h-0 flex-1 touch-pan-y"
			aria-label="Habit carousel"
			opts={{
				loop: habitCount > 1,
				startIndex,
				watchDrag: () => dragAllowed,
				align: 'start',
				duration: prefersSimpleCardMotion() ? 20 : 25
			}}
			setApi={handleEmblaInit}
		>
			<Carousel.Content class="h-full min-h-0 -ms-0 [transform:translate3d(0,0,0)]">
				{#each habits as habit, index (habit.id)}
					{@const isCurrent = index === currentIndex}
					{@const isRendered = renderedIndices.has(index)}
					<Carousel.Item class="h-full ps-0 me-3">
						<div class="h-full min-h-0">
							{#if !isRendered}
								<HabitCardPlaceholder />
							{:else}
								<SwipeHabitCard
									{habit}
									log={habit.log}
									{timezone}
									hideLog
									active={isCurrent}
									initialForm={isCurrent ? cardInitialForm : null}
									fillHeight
									showEdit={false}
									currentStreak={isCurrent ? currentStreak : null}
									busy={carouselBusy && isCurrent}
									stamp={isCurrent ? stamp : null}
									formPreview={isCurrent ? formPreview : null}
									bind:actualValue
									bind:actualTime
									bind:satisfaction
									bind:touched
								/>
							{/if}
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
		</Carousel.Root>
	{/key}

	{#if habitCount > 1}
		<div
			class="flex shrink-0 items-center justify-center gap-1.5 py-2"
			role="status"
			aria-label="Habit {currentIndex + 1} of {habitCount}"
		>
			{#each habits as habit, index (index)}
				{@const dotLogged = habit.log?.status === 'logged'}
				{@const dotSkipped = habit.log?.status === 'skipped'}
				<span
					class="rounded-full transition-[width,background-color] duration-200 {index === currentIndex
						? dotLogged
							? 'h-1.5 w-4 bg-green'
							: dotSkipped
								? 'h-1.5 w-4 bg-yellow'
								: 'h-1.5 w-4 bg-blue'
						: dotLogged
							? 'size-1.5 bg-green/70'
							: dotSkipped
								? 'size-1.5 bg-yellow/70'
								: 'size-1.5 bg-surface-2'}"
					aria-hidden="true"
				></span>
			{/each}
		</div>
	{/if}

	<HabitActionBar
		{canUndo}
		canSkip={currentCanSkip}
		{canCheck}
		canNailIt={canNailItAction}
		{hasExistingLog}
		binaryMode={currentHabit?.type === 'do_binary'}
		busy={carouselBusy}
		onundo={handleUndo}
		onfail={handleFail}
		onnailedit={handleNailedIt}
		oncheck={handleCheck}
		onskip={handleSkip}
	/>
</div>
