<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import type { HabitCardForm } from '$lib/habits/card-actions';
	import { blankCardForm, canCheckHabit } from '$lib/habits/card-actions';
	import {
		calculateAdherence,
		formatTimeLabel,
		inputFromLog,
		nowTimeString,
		parseTimeToMinutes,
		previewAdherenceLabel
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
	import { mdiPencil } from '@mdi/js';

	let {
		habit,
		log = null,
		timezone,
		hideLog = false,
		initialForm = null,
		busy = false,
		interactive = true,
		fillHeight = false,
		illustrationSrc,
		dragX = $bindable(0),
		dragging = $bindable(false),
		actualValue = $bindable<number | null>(null),
		actualTime = $bindable(''),
		satisfaction = $bindable<number | null>(null),
		touched = $bindable(false),
		stamp = null,
		formPreview = null,
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
		illustrationSrc?: string;
		dragX?: number;
		dragging?: boolean;
		actualValue?: number | null;
		actualTime?: string;
		satisfaction?: number | null;
		touched?: boolean;
		stamp?: 'nailed-it' | null;
		formPreview?: HabitCardForm | null;
		onfail?: () => void | Promise<void>;
		oncheck?: () => void | Promise<void>;
	} = $props();

	let startX = $state(0);
	let actualTimeMinutes = $state<number | null>(null);

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
			if (dragX >= 40) return 100;
			if (dragX <= -40) return 0;
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

	const transform = $derived(`translateX(${dragX}px) rotate(${dragX * 0.04}deg)`);
	const transformTransition = $derived(!dragging ? 'transform 200ms ease-out' : 'none');

	function resetDrag() {
		dragX = 0;
		dragging = false;
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
		dragging = true;
		startX = event.clientX;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		dragX = event.clientX - startX;
	}

	async function onPointerUp() {
		if (!dragging) return;
		const threshold = 96;

		if (dragX <= -threshold && onfail) {
			resetDrag();
			await onfail();
			return;
		}

		if (dragX >= threshold && canCheck && oncheck) {
			resetDrag();
			await oncheck();
			return;
		}

		resetDrag();
	}
</script>

<div
	class="relative select-none overflow-hidden rounded-2xl border border-surface-0/50 bg-surface-1 shadow-xl shadow-crust/50 {fillHeight
		? 'flex h-full min-h-0 flex-col'
		: ''}"
	role="group"
	aria-label="{habit.name} logging card"
	style:transform
	style:transition={transformTransition}
	style:touch-action={interactive ? 'pan-y' : undefined}
	onpointerdown={interactive ? onPointerDown : undefined}
	onpointermove={interactive ? onPointerMove : undefined}
	onpointerup={interactive ? onPointerUp : undefined}
	onpointercancel={interactive ? onPointerUp : undefined}
>
	{#if stamp === 'nailed-it'}
		<CardActionStamp label="Nailed it" variant="yellow" />
	{/if}

	<div
		class="relative overflow-hidden bg-surface-0/15 {fillHeight
			? 'min-h-0 flex-1'
			: 'h-44 shrink-0'}"
		aria-hidden="true"
	>
		<img
			src={resolvedIllustration}
			alt=""
			class="absolute inset-0 h-full w-full object-contain object-bottom p-6 pb-2"
		/>
	</div>

	<div class="shrink-0 p-5 pt-3">
		<div class="mb-4 flex items-start justify-between gap-3">
			<div>
				<p class="m-0 text-sm font-semibold text-blue">{formatTimeLabel(habit.anchor_time)}</p>
				<h2 class="mt-1.5 mb-0 text-2xl font-bold">{habit.name}</h2>
			</div>
			<a
				href="/habits/{habit.id}/edit"
				class="grid shrink-0 place-items-center rounded-lg p-1.5 text-subtext-0 no-underline"
				aria-label="Edit {habit.name}"
				onpointerdown={(event) => event.stopPropagation()}
			>
				<Icon path={mdiPencil} size={18} />
			</a>
		</div>

		{#if habit.type === 'do_target'}
			<div class="mb-4 grid gap-2">
				<p class="m-0 text-subtext-1">
					Target {habit.target_value} {habit.target_unit}
				</p>
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
				/>
			</div>
		{:else if habit.type === 'do_on_time'}
			<div class="mb-4 grid gap-2">
				<p class="m-0 text-subtext-1">Target {formatTimeLabel(habit.target_time)}</p>
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
				/>
			</div>
		{:else if habit.type === 'avoid' || habit.type === 'rate'}
			<div class="mb-4 grid gap-3">
				<p class="m-0 text-subtext-1">How did you do?</p>
				<StarRating bind:value={satisfaction} disabled={busy} onselect={markTouched} />
			</div>
		{/if}

		<div class="flex items-baseline gap-2">
			{#if previewScore == null}
				<span class="text-subtext-0">Swipe or use the buttons below</span>
			{:else}
				<span class="text-3xl font-bold">{previewScore}%</span>
				<span class="text-subtext-0">{previewAdherenceLabel(previewScore)}</span>
			{/if}
		</div>
	</div>
</div>
