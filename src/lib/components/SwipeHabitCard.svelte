<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Habit, HabitLog } from '$lib/database.types';
	import type { HabitCardForm } from '$lib/habits/card-actions';
	import { blankCardForm, canCheckHabit } from '$lib/habits/card-actions';
	import {
		calculateAdherence,
		formatTimeLabel,
		inputFromLog,
		nowTimeString,
		parseTimeToMinutes,
		previewAdherenceIcon
	} from '$lib/habits/adherence';
	import { getIllustrationForAnchorTime } from '$lib/illustrations';
	import CardActionStamp from '$lib/components/CardActionStamp.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import StepLogInput from '$lib/components/StepLogInput.svelte';
	import {
		minutesToTimeString,
		quickTargetOptions,
		quickTimeOptions
	} from '$lib/habits/log-input';
	import {
		CARD_ACTION_STAMPS,
		CARD_SWIPE_ACTION_THRESHOLD_PX,
		CARD_SWIPE_PREVIEW_START_PX,
		cardDragTransform,
		swipePreviewOpacity,
		type CardActionStampType
	} from '$lib/habits/card-action-animation';
	import { mdiPencil } from '@mdi/js';

	const CARD_IMAGE_HEIGHT_CLASS = 'h-36 sm:h-40';

	let {
		habit,
		log = null,
		timezone,
		hideLog = false,
		initialForm = null,
		busy = false,
		interactive = true,
		fillHeight = false,
		showEdit = true,
		illustrationSrc,
		dragX = $bindable(0),
		dragging = $bindable(false),
		actualValue = $bindable<number | null>(null),
		actualTime = $bindable(''),
		satisfaction = $bindable<number | null>(null),
		touched = $bindable(false),
		stamp = null,
		formPreview = null,
		ondragframe,
		onfail,
		oncheck
	}: {
		habit: Habit;
		log?: HabitLog | null;
		timezone: string;
		hideLog?: boolean;
		initialForm?: HabitCardForm | null;
		busy?: boolean;
		interactive?: boolean;
		fillHeight?: boolean;
		showEdit?: boolean;
		illustrationSrc?: string;
		dragX?: number;
		dragging?: boolean;
		actualValue?: number | null;
		actualTime?: string;
		satisfaction?: number | null;
		touched?: boolean;
		stamp?: CardActionStampType | null;
		formPreview?: HabitCardForm | null;
		ondragframe?: (dragX: number) => void;
		onfail?: () => void | Promise<void>;
		oncheck?: () => void | Promise<void>;
	} = $props();

	let cardEl = $state<HTMLDivElement | undefined>();
	let startX = $state(0);
	let settling = $state(false);
	let frameDragX = $state(0);
	let actualTimeMinutes = $state<number | null>(null);

	let liveDragX = 0;
	let dragRafId: number | null = null;

	$effect(() => {
		habit.id;

		if (initialForm) {
			actualValue = initialForm.actualValue;
			actualTime = initialForm.actualTime;
			satisfaction = initialForm.satisfaction;
			touched = initialForm.touched;
			actualTimeMinutes = actualTime ? parseTimeToMinutes(actualTime) : null;
			return;
		}

		if (!hideLog && log != null) {
			const input = inputFromLog(habit, log, timezone);
			actualValue =
				habit.type === 'do_binary' ? (input.actualValue ?? null) : (input.actualValue ?? 0);
			actualTime = (input.actualTime ?? '').slice(0, 5);
			satisfaction = input.satisfaction ?? null;
			touched = true;
			actualTimeMinutes = actualTime ? parseTimeToMinutes(actualTime) : null;
			return;
		}

		const blank = blankCardForm(habit);
		actualValue = blank.actualValue;
		actualTime = blank.actualTime;
		satisfaction = blank.satisfaction;
		touched = false;
		actualTimeMinutes = null;
	});

	$effect(() => {
		if (!formPreview) return;
		actualValue = formPreview.actualValue;
		actualTime = formPreview.actualTime;
		actualTimeMinutes = formPreview.actualTime
			? parseTimeToMinutes(formPreview.actualTime)
			: null;
		satisfaction = formPreview.satisfaction;
		touched = formPreview.touched;
	});

	const form = $derived<HabitCardForm>({
		actualValue,
		actualTime,
		satisfaction,
		touched
	});

	const canCheck = $derived(canCheckHabit(habit, form));

	const previewScore = $derived.by(() => {
		if (interactive && dragging && habit.type === 'do_binary') {
			if (frameDragX >= 40) return 100;
			if (frameDragX <= -40) return 0;
		}

		if (habit.type === 'do_binary') return null;

		return calculateAdherence(habit, {
			actualValue,
			actualTime: actualTime ? `${actualTime}:00` : null,
			satisfaction
		});
	});

	const resolvedIllustration = $derived(
		illustrationSrc ?? getIllustrationForAnchorTime(habit.anchor_time)
	);

	const logStep = $derived(habit.log_step ?? 5);

	const targetQuickOptions = $derived(
		habit.type === 'do_target' && habit.target_value != null
			? quickTargetOptions(Number(habit.target_value))
			: []
	);

	const timeQuickOptions = $derived(
		habit.type === 'do_on_time' && habit.target_time
			? quickTimeOptions(
					habit.target_time,
					logStep,
					habit.grace_minutes,
					parseTimeToMinutes(nowTimeString(new Date(), timezone))
				)
			: []
	);

	const habitTargetLabel = $derived.by(() => {
		if (habit.type === 'do_target' && habit.target_value != null) {
			return `${habit.target_value} ${habit.target_unit}`;
		}

		if (habit.type === 'do_on_time' && habit.target_time) {
			return formatTimeLabel(habit.target_time);
		}

		return null;
	});

	const transform = $derived(cardDragTransform(dragX));
	const transformTransition = $derived(!dragging ? 'transform 200ms ease-out' : 'none');
	const promoteLayer = $derived(dragging || dragX !== 0 || settling);

	const failurePreviewProgress = $derived(
		interactive && dragging && !stamp && frameDragX < -CARD_SWIPE_PREVIEW_START_PX
			? swipePreviewOpacity(frameDragX)
			: 0
	);

	const successPreviewProgress = $derived(
		interactive && dragging && !stamp && frameDragX > CARD_SWIPE_PREVIEW_START_PX
			? swipePreviewOpacity(frameDragX)
			: 0
	);

	function clearDirectTransform() {
		if (cardEl) cardEl.style.transform = '';
	}

	function cancelDragFrame() {
		if (dragRafId == null) return;
		cancelAnimationFrame(dragRafId);
		dragRafId = null;
	}

	function applyDragFrame() {
		if (!dragging || !cardEl) return;
		cardEl.style.transform = cardDragTransform(liveDragX);
		ondragframe?.(liveDragX);
		frameDragX = liveDragX;
	}

	function flushDragFrame() {
		cancelDragFrame();
		applyDragFrame();
	}

	function scheduleDragFrame() {
		if (dragRafId != null) return;
		dragRafId = requestAnimationFrame(() => {
			dragRafId = null;
			applyDragFrame();
		});
	}

	function resetDrag() {
		cancelDragFrame();
		clearDirectTransform();
		if (liveDragX !== 0) settling = true;
		liveDragX = 0;
		frameDragX = 0;
		dragX = 0;
		dragging = false;
	}

	function onTransformTransitionEnd(event: TransitionEvent) {
		if (event.propertyName !== 'transform') return;
		settling = false;
	}

	function markTouched() {
		touched = true;
	}

	function syncActualTimeFromMinutes() {
		actualTime = actualTimeMinutes == null ? '' : minutesToTimeString(actualTimeMinutes);
		markTouched();
	}

	function onPointerDown(event: PointerEvent) {
		if (!interactive || busy) return;
		settling = false;
		liveDragX = 0;
		frameDragX = 0;
		dragging = true;
		startX = event.clientX;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		liveDragX = event.clientX - startX;
		scheduleDragFrame();
	}

	async function onPointerUp() {
		if (!dragging) return;
		flushDragFrame();

		const x = liveDragX;
		const threshold = CARD_SWIPE_ACTION_THRESHOLD_PX;

		if (x <= -threshold && onfail) {
			resetDrag();
			await onfail();
			return;
		}

		if (x >= threshold && canCheck && oncheck) {
			resetDrag();
			await oncheck();
			return;
		}

		resetDrag();
	}

	onDestroy(cancelDragFrame);
</script>

<div
	bind:this={cardEl}
	class="relative select-none overflow-hidden rounded-2xl border border-surface-0/50 bg-surface-1 shadow-xl shadow-crust/50 {fillHeight
		? 'flex h-full min-h-0 flex-col'
		: ''}"
	role="group"
	aria-label="{habit.name} logging card"
	style:transform={dragging ? undefined : transform}
	style:transition={transformTransition}
	style:will-change={promoteLayer ? 'transform' : undefined}
	style:touch-action={interactive ? 'pan-y' : undefined}
	onpointerdown={interactive ? onPointerDown : undefined}
	ontransitionend={interactive ? onTransformTransitionEnd : undefined}
	onpointermove={interactive ? onPointerMove : undefined}
	onpointerup={interactive ? onPointerUp : undefined}
	onpointercancel={interactive ? onPointerUp : undefined}
>
	{#if failurePreviewProgress > 0}
		<CardActionStamp
			label={CARD_ACTION_STAMPS.failure.label}
			variant={CARD_ACTION_STAMPS.failure.variant}
			mode="preview"
			progress={failurePreviewProgress}
			align="right"
		/>
	{/if}
	{#if successPreviewProgress > 0}
		<CardActionStamp
			label={CARD_ACTION_STAMPS.success.label}
			variant={CARD_ACTION_STAMPS.success.variant}
			mode="preview"
			progress={successPreviewProgress}
			align="left"
		/>
	{/if}
	{#if stamp}
		<CardActionStamp
			label={CARD_ACTION_STAMPS[stamp].label}
			variant={CARD_ACTION_STAMPS[stamp].variant}
		/>
	{/if}

	<div class="shrink-0 px-5 pt-4 pb-2">
		<div class="flex min-w-0 items-center justify-between gap-3">
			<h2 class="m-0 min-w-0 truncate text-xl font-bold sm:text-2xl">{habit.name}</h2>
			<div class="flex shrink-0 items-center gap-2">
				{#if habitTargetLabel}
					<span class="text-sm font-semibold text-blue tabular-nums">{habitTargetLabel}</span>
				{/if}
				{#if showEdit}
					<a
						href="/habits/{habit.id}/edit"
						class="grid place-items-center rounded-lg p-1.5 text-subtext-0 no-underline"
						aria-label="Edit {habit.name}"
						onpointerdown={(event) => event.stopPropagation()}
					>
						<Icon path={mdiPencil} size={18} />
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div
		class="relative shrink-0 overflow-hidden bg-surface-0/15 {CARD_IMAGE_HEIGHT_CLASS}"
		aria-hidden="true"
	>
		<img
			src={resolvedIllustration}
			alt=""
			class="absolute inset-0 h-full w-full object-contain object-center p-4"
		/>
	</div>

	<div
		class="shrink-0 px-5 pt-2 pb-4 {fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''}"
	>
		{#snippet adherenceIndicator()}
			{#if previewScore != null}
				<div class="flex shrink-0 items-center gap-1 pl-1 text-lg leading-none">
					<span class="font-bold tabular-nums">{previewScore}%</span>
					<Icon path={previewAdherenceIcon(previewScore)} size={18} class="text-subtext-0" />
				</div>
			{/if}
		{/snippet}

		{#if habit.type === 'do_target'}
			<StepLogInput
				bind:value={actualValue}
				step={logStep}
				baseline={0}
				min={0}
				quickOptions={targetQuickOptions}
				formatDisplay={(value) => `${value} ${habit.target_unit}`}
				disabled={busy}
				ariaLabel="Actual amount for {habit.name}"
				onselect={markTouched}
				controlsTrailing={adherenceIndicator}
			/>
		{:else if habit.type === 'do_on_time'}
			<StepLogInput
				bind:value={actualTimeMinutes}
				step={logStep}
				baseline={habit.target_time ? parseTimeToMinutes(habit.target_time) : 0}
				min={0}
				max={24 * 60 - 1}
				quickOptions={timeQuickOptions}
				formatDisplay={(minutes) => formatTimeLabel(minutesToTimeString(minutes))}
				disabled={busy}
				ariaLabel="Actual time for {habit.name}"
				onselect={syncActualTimeFromMinutes}
				controlsTrailing={adherenceIndicator}
			/>
		{:else if habit.type === 'avoid' || habit.type === 'rate'}
			<div class="flex items-center justify-between gap-3">
				<StarRating bind:value={satisfaction} disabled={busy} onselect={markTouched} />
				{@render adherenceIndicator()}
			</div>
		{/if}
	</div>
</div>
