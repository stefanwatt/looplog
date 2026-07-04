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
	import { getHabitIllustration, type IllustrationComponent } from '$lib/illustrations';
	import { logCardStatus } from '$lib/habits/service';
	import CardActionStamp from '$lib/components/CardActionStamp.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import StepLogInput from '$lib/components/StepLogInput.svelte';
	import {
		minutesToTimeString,
		quickTargetOptions,
		quickTimeOptions
	} from '$lib/habits/log-input';
	import { cardActionStampLabel, CARD_ACTION_STAMPS, type CardActionStampType } from '$lib/habits/card-action-animation';
	import { mdiPencil } from '@mdi/js';

	const CARD_IMAGE_HEIGHT_CLASS = 'h-36 sm:h-40';

	let {
		habit,
		log = null,
		timezone,
		initialForm = null,
		active = false,
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
		active?: boolean;
		busy?: boolean;
		interactive?: boolean;
		fillHeight?: boolean;
		showEdit?: boolean;
		illustrationSrc?: IllustrationComponent;
		currentStreak?: number | null;
		actualValue?: number | null;
		actualTime?: string;
		satisfaction?: number | null;
		touched?: boolean;
		stamp?: CardActionStampType | null;
		formPreview?: HabitCardForm | null;
	} = $props();

	let actualTimeMinutes = $state<number | null>(null);
	let previewValue = $state<number | null>(null);
	let previewTime = $state('');
	let previewSatisfaction = $state<number | null>(null);
	let previewTimeMinutes = $state<number | null>(null);

	function loadFromLog() {
		if (log != null) {
			const input = inputFromLog(habit, log, timezone);
			const value =
				habit.type === 'do_binary' ? (input.actualValue ?? null) : (input.actualValue ?? 0);
			const time = (input.actualTime ?? '').slice(0, 5);
			return {
				actualValue: value,
				actualTime: time,
				satisfaction: input.satisfaction ?? null,
				touched: true,
				actualTimeMinutes: time ? parseTimeToMinutes(time) : null
			};
		}

		const blank = blankCardForm(habit);
		return {
			actualValue: blank.actualValue,
			actualTime: blank.actualTime,
			satisfaction: blank.satisfaction,
			touched: false,
			actualTimeMinutes: null as number | null
		};
	}

	function applyPreview(form: {
		actualValue: number | null;
		actualTime: string;
		satisfaction: number | null;
		actualTimeMinutes: number | null;
	}) {
		previewValue = form.actualValue;
		previewTime = form.actualTime;
		previewSatisfaction = form.satisfaction;
		previewTimeMinutes = form.actualTimeMinutes;
	}

	function applyActive(form: {
		actualValue: number | null;
		actualTime: string;
		satisfaction: number | null;
		touched: boolean;
		actualTimeMinutes: number | null;
	}) {
		actualValue = form.actualValue;
		actualTime = form.actualTime;
		satisfaction = form.satisfaction;
		touched = form.touched;
		actualTimeMinutes = form.actualTimeMinutes;
	}

	$effect(() => {
		habit.id;
		log;

		if (active) return;

		const form = loadFromLog();
		applyPreview(form);
	});

	$effect(() => {
		if (!active) return;

		habit.id;
		initialForm;
		log;

		if (initialForm) {
			applyActive({
				actualValue: initialForm.actualValue,
				actualTime: initialForm.actualTime,
				satisfaction: initialForm.satisfaction,
				touched: initialForm.touched,
				actualTimeMinutes: initialForm.actualTime
					? parseTimeToMinutes(initialForm.actualTime)
					: null
			});
			return;
		}

		const form = loadFromLog();
		applyActive({ ...form, touched: form.touched });
	});

	$effect(() => {
		if (!active || !formPreview) return;

		applyActive({
			actualValue: formPreview.actualValue,
			actualTime: formPreview.actualTime,
			satisfaction: formPreview.satisfaction,
			touched: formPreview.touched,
			actualTimeMinutes: formPreview.actualTime
				? parseTimeToMinutes(formPreview.actualTime)
				: null
		});
	});

	const displayValue = $derived(active ? actualValue : previewValue);
	const displayTimeMinutes = $derived(active ? actualTimeMinutes : previewTimeMinutes);
	const displaySatisfaction = $derived(active ? satisfaction : previewSatisfaction);
	const displayTime = $derived(active ? actualTime : previewTime);

	const hasLoggedEntry = $derived(log?.status === 'logged');
	const logStatus = $derived(logCardStatus(habit, log));

	const statusTextClass = $derived(
		logStatus?.variant === 'green'
			? 'text-green'
			: logStatus?.variant === 'yellow'
				? 'text-yellow'
				: logStatus?.variant === 'red'
					? 'text-red'
					: ''
	);

	const previewScore = $derived.by(() => {
		if (habit.type === 'do_binary') return null;

		const hasDefaultSatisfaction =
			(habit.type === 'avoid' || habit.type === 'rate') && displaySatisfaction != null;
		const showScore = hasLoggedEntry || (active && (touched || hasDefaultSatisfaction));
		if (!showScore) return null;

		return calculateAdherence(habit, {
			actualValue: displayValue,
			actualTime: displayTime ? `${displayTime}:00` : null,
			satisfaction: displaySatisfaction
		});
	});

	const Illustration = $derived(illustrationSrc ?? getHabitIllustration(habit));

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
		if (!active) return;
		touched = true;
	}

	function syncActualTimeFromMinutes() {
		if (!active) return;
		actualTime = actualTimeMinutes == null ? '' : minutesToTimeString(actualTimeMinutes);
		markTouched();
	}
</script>

<div
	class="relative overflow-hidden rounded-2xl border border-surface-0/50 bg-surface-1 shadow-xl shadow-crust/50 {fillHeight
		? 'flex h-full min-h-0 flex-col'
		: ''} {active ? '' : 'pointer-events-none'}"
	role="group"
	aria-label="{habit.name} logging card"
	aria-hidden={active ? undefined : true}
>
	{#if active && stamp}
		<CardActionStamp
			label={cardActionStampLabel(stamp, habit.type === 'do_binary')}
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
			<Illustration class="absolute inset-0 h-full w-full p-4" />
		</div>
	</div>

	<div class="shrink-0 bg-text px-5 pt-3 pb-4 text-base">
		{#if logStatus && habit.type !== 'do_binary'}
			<div
				class="mb-3 flex items-baseline justify-between gap-3 border-b border-base/15 pb-2.5"
				role="status"
			>
				<span class="text-sm font-medium text-base/65">Today's log</span>
				<span class="text-xl font-bold tabular-nums {statusTextClass}">{logStatus.label}</span>
			</div>
		{/if}

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
			{#if active}
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
			{:else}
				<StepLogInput
					value={displayValue ?? 0}
					step={logStep}
					baseline={0}
					min={0}
					quickOptions={targetQuickOptions}
					formatDisplay={(value) => String(value)}
					disabled
					inverted
					ariaLabel="Actual amount for {habit.name}"
					controlsLeading={previewScore != null ? adherenceScore : undefined}
					controlsTrailing={previewScore != null ? adherenceEmoji : undefined}
				/>
			{/if}
		{:else if habit.type === 'do_on_time'}
			{#if active}
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
			{:else}
				<StepLogInput
					value={displayTimeMinutes ?? 0}
					step={logStep}
					baseline={habit.target_time ? parseTimeToMinutes(habit.target_time) : 0}
					min={0}
					max={24 * 60 - 1}
					quickOptions={timeQuickOptions}
					formatDisplay={(minutes) => formatTimeLabel(minutesToTimeString(minutes))}
					disabled
					inverted
					ariaLabel="Actual time for {habit.name}"
					controlsLeading={previewScore != null ? adherenceScore : undefined}
					controlsTrailing={previewScore != null ? adherenceEmoji : undefined}
				/>
			{/if}
		{:else if habit.type === 'avoid' || habit.type === 'rate'}
			<div class="relative flex items-center justify-center">
				{#if active}
					<StarRating bind:value={satisfaction} disabled={busy} inverted onselect={markTouched} />
				{:else}
					<StarRating value={displaySatisfaction} disabled inverted />
				{/if}
				<div class="absolute top-1/2 right-0 -translate-y-1/2">
					{@render adherenceIndicator()}
				</div>
			</div>
		{:else if habit.type === 'do_binary'}
			<div class="flex flex-col items-center gap-1.5 py-2 text-center">
				{#if logStatus?.label === 'Skipped'}
					<p class="m-0 text-lg font-semibold {statusTextClass}">Skipped today</p>
					<p class="m-0 text-sm text-base/70">Tap an action below to update</p>
				{:else if hasLoggedEntry}
					<p class="m-0 text-lg font-semibold {statusTextClass}">
						{log?.actual_value === 1 ? 'Done today' : 'Not done today'}
					</p>
					<p class="m-0 text-sm text-base/70">Tap an action below to update</p>
				{:else}
					<p class="m-0 text-lg font-semibold">Did you do it today?</p>
					<p class="m-0 text-sm text-base/70">{binaryContextLabel}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
