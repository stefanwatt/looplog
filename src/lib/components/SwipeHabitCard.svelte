<script lang="ts">
	import type { Habit, HabitLog } from '$lib/database.types';
	import type { HabitCardForm } from '$lib/habits/card-actions';
	import { blankCardForm } from '$lib/habits/card-actions';
	import {
		calculateAdherence,
		formatTimeLabel,
		inputFromLog,
		nowTimeString,
		parseTimeToMinutes,
		previewAdherenceIcon
	} from '$lib/habits/adherence';
	import { getHabitIllustration } from '$lib/illustrations';
	import CardActionStamp from '$lib/components/CardActionStamp.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import StepLogInput from '$lib/components/StepLogInput.svelte';
	import {
		minutesToTimeString,
		quickTargetOptions,
		quickTimeOptions
	} from '$lib/habits/log-input';
	import { CARD_ACTION_STAMPS, type CardActionStampType } from '$lib/habits/card-action-animation';
	import { mdiPencil } from '@mdi/js';

	const CARD_IMAGE_HEIGHT_CLASS = 'h-36 sm:h-40';

	let {
		habit,
		log = null,
		timezone,
		initialForm = null,
		busy = false,
		fillHeight = false,
		showEdit = true,
		illustrationSrc,
		currentStreak = null,
		actualValue = $bindable<number | null>(null),
		actualTime = $bindable(''),
		satisfaction = $bindable<number | null>(null),
		touched = $bindable(false),
		stamp = null,
		formPreview = null
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
		currentStreak?: number | null;
		actualValue?: number | null;
		actualTime?: string;
		satisfaction?: number | null;
		touched?: boolean;
		stamp?: CardActionStampType | null;
		formPreview?: HabitCardForm | null;
	} = $props();

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

		if (log != null) {
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

	const previewScore = $derived.by(() => {
		if (habit.type === 'do_binary') return null;

		return calculateAdherence(habit, {
			actualValue,
			actualTime: actualTime ? `${actualTime}:00` : null,
			satisfaction
		});
	});

	const resolvedIllustration = $derived(illustrationSrc ?? getHabitIllustration(habit));

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

	const binaryContextLabel = $derived.by(() => {
		const schedule = habit.anchor_time ? formatTimeLabel(habit.anchor_time) : 'Anytime';
		if (currentStreak != null && currentStreak > 0) {
			return `${schedule} · ${currentStreak}-day`;
		}
		return schedule;
	});

	const habitTargetLabel = $derived.by(() => {
		if (habit.type === 'do_target' && habit.target_value != null) {
			return `Target ${habit.target_value} ${habit.target_unit}`;
		}

		if (habit.type === 'do_on_time' && habit.target_time) {
			return `Target ${formatTimeLabel(habit.target_time)}`;
		}

		return null;
	});

	function markTouched() {
		touched = true;
	}

	function syncActualTimeFromMinutes() {
		actualTime = actualTimeMinutes == null ? '' : minutesToTimeString(actualTimeMinutes);
		markTouched();
	}
</script>

<div
	class="relative overflow-hidden rounded-2xl border border-surface-0/50 bg-surface-1 shadow-xl shadow-crust/50 {fillHeight
		? 'flex h-full min-h-0 flex-col'
		: ''}"
	role="group"
	aria-label="{habit.name} logging card"
>
	{#if stamp}
		<CardActionStamp
			label={CARD_ACTION_STAMPS[stamp].label}
			variant={CARD_ACTION_STAMPS[stamp].variant}
		/>
	{/if}

	<div class="shrink-0 bg-text px-5 pt-4 pb-3 text-base">
		<div class="flex min-w-0 items-center justify-between gap-3">
			<h2 class="m-0 min-w-0 truncate text-xl font-bold sm:text-2xl">{habit.name}</h2>
			<div class="flex shrink-0 items-center gap-2">
				{#if habitTargetLabel}
					<span class="text-sm font-semibold text-inverted-accent tabular-nums"
						>{habitTargetLabel}</span
					>
				{/if}
				{#if showEdit}
					<a
						href="/habits/{habit.id}/edit"
						class="grid place-items-center rounded-lg p-1.5 text-base/70 no-underline hover:text-base"
						aria-label="Edit {habit.name}"
					>
						<Icon path={mdiPencil} size={18} />
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div
		class="flex min-h-0 flex-col justify-center px-5 {fillHeight ? 'flex-1' : 'shrink-0 py-2'}"
	>
		<div
			class="relative w-full shrink-0 overflow-hidden {CARD_IMAGE_HEIGHT_CLASS}"
			aria-hidden="true"
		>
			<img
				src={resolvedIllustration}
				alt=""
				class="absolute inset-0 h-full w-full object-contain object-center p-4"
			/>
		</div>
	</div>

	<div class="shrink-0 bg-text px-5 pt-3 pb-4 text-base">
		{#snippet adherenceScore()}
			{#if previewScore != null}
				<span class="text-[1rem] font-bold leading-none tabular-nums">{previewScore}%</span>
			{/if}
		{/snippet}

		{#snippet adherenceEmoji()}
			{#if previewScore != null}
				<Icon path={previewAdherenceIcon(previewScore)} size={22} class="text-base/70" />
			{/if}
		{/snippet}

		{#snippet adherenceIndicator()}
			{#if previewScore != null}
				<div class="flex shrink-0 items-center gap-0.5 text-[1rem] leading-none">
					<span class="font-bold tabular-nums">{previewScore}%</span>
					<Icon path={previewAdherenceIcon(previewScore)} size={22} class="text-base/70" />
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
				formatDisplay={(value) => String(value)}
				disabled={busy}
				inverted
				ariaLabel="Actual amount for {habit.name}"
				onselect={markTouched}
				controlsLeading={previewScore != null ? adherenceScore : undefined}
				controlsTrailing={previewScore != null ? adherenceEmoji : undefined}
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
				inverted
				ariaLabel="Actual time for {habit.name}"
				onselect={syncActualTimeFromMinutes}
				controlsLeading={previewScore != null ? adherenceScore : undefined}
				controlsTrailing={previewScore != null ? adherenceEmoji : undefined}
			/>
		{:else if habit.type === 'avoid' || habit.type === 'rate'}
			<div class="flex items-center justify-between gap-3">
				<StarRating bind:value={satisfaction} disabled={busy} inverted onselect={markTouched} />
				{@render adherenceIndicator()}
			</div>
		{:else if habit.type === 'do_binary'}
			<div class="flex flex-col items-center gap-1.5 py-2 text-center">
				<p class="m-0 text-lg font-semibold">Did you do it today?</p>
				<p class="m-0 text-sm text-base/70">{binaryContextLabel}</p>
			</div>
		{/if}
	</div>
</div>
