<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import { defaultScoringForType, DEFAULT_LOG_STEP, habitTypeHasAnchorStep, habitTypeHasConfigStep } from '$lib/habits/defaults';
	import {
		ALL_DAYS,
		daysToPreset,
		presetToDays,
		type SchedulePreset,
		weekdayLabel
	} from '$lib/habits/schedule';
	import { archiveHabit, habitTypeLabel, updateHabit } from '$lib/habits/service';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { createClient } from '$lib/supabase/client';
	import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';

	let { data } = $props();

	const habit = data.habit;
	const initialSchedule = daysToPreset(habit.active_days);

	let step = $state(1);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	let name = $state(habit.name);
	let schedulePreset = $state<SchedulePreset>(initialSchedule.preset);
	let customDays = $state<number[]>(initialSchedule.customDays);
	let allowSkip = $state(habit.allow_skip);
	let maxConsecutiveSkips = $state(habit.max_consecutive_skips);

	let targetValue = $state(Number(habit.target_value ?? 60));
	let targetUnit = $state(habit.target_unit ?? 'min');
	let targetTime = $state((habit.target_time ?? '06:00:00').slice(0, 5));
	let graceMinutes = $state(habit.grace_minutes);
	let falloffMinutes = $state(habit.falloff_minutes_per_10_percent);
	let logStep = $state(habit.log_step ?? DEFAULT_LOG_STEP);

	let anchorTime = $state(habit.anchor_time?.slice(0, 5) ?? '');
	let isAnytime = $state(habit.anchor_time == null);

	const hasConfigStep = habitTypeHasConfigStep(habit.type);
	const hasAnchorStep = habitTypeHasAnchorStep(habit.type);
	const totalSteps = 2 + (hasConfigStep ? 1 : 0) + (hasAnchorStep ? 1 : 0);
	const isSaveStep = $derived(step === 4 || (step === 3 && !hasAnchorStep));
	const displayStep = $derived(
		step === 4 && !hasConfigStep
			? totalSteps
			: step === 3 && hasConfigStep && !hasAnchorStep
				? totalSteps
				: step
	);

	function nextStep() {
		if (step === 2 && !hasConfigStep) {
			step = hasAnchorStep ? 4 : 3;
		} else {
			step = Math.min(4, step + 1);
		}
	}

	function prevStep() {
		if (step === 4 && !hasConfigStep) {
			step = 2;
		} else {
			step = Math.max(1, step - 1);
		}
	}

	function toggleDay(day: number) {
		customDays = customDays.includes(day)
			? customDays.filter((value) => value !== day)
			: [...customDays, day].sort((a, b) => a - b);
	}

	async function saveHabit() {
		saving = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			const scoring = defaultScoringForType(habit.type);
			const activeDays = presetToDays(
				schedulePreset,
				schedulePreset === 'custom' ? customDays : undefined
			);

			const targetTimeValue = `${targetTime}:00`;

			const updated = await updateHabit(supabase, user.id, habit.id, {
				name: name.trim(),
				active_days: activeDays,
				allow_skip: allowSkip,
				max_consecutive_skips: maxConsecutiveSkips,
				anchor_time:
					habit.type === 'do_on_time'
						? targetTimeValue
						: isAnytime || !anchorTime
							? null
							: `${anchorTime}:00`,
				target_value: habit.type === 'do_target' ? targetValue : null,
				target_unit: habit.type === 'do_target' ? targetUnit : null,
				target_time: habit.type === 'do_on_time' ? targetTimeValue : null,
				grace_minutes: habit.type === 'do_on_time' ? graceMinutes : scoring.grace_minutes,
				falloff_minutes_per_10_percent:
					habit.type === 'do_on_time' ? falloffMinutes : scoring.falloff_minutes_per_10_percent,
				log_step: hasConfigStep ? logStep : undefined
			});

			getDayStore().applyHabit(updated);
			await goto('/day', { invalidateAll: false });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not update habit';
		} finally {
			saving = false;
		}
	}

	async function deleteHabit() {
		if (
			!confirm(`Delete "${name.trim()}"? Past logs are kept, but the habit won't appear again.`)
		) {
			return;
		}

		deleting = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			const archived = await archiveHabit(supabase, user.id, habit.id);
			getDayStore().applyHabit(archived);
			await goto('/day', { invalidateAll: false });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete habit';
		} finally {
			deleting = false;
		}
	}

	const inputClass =
		'w-full rounded-xl border border-surface-0 bg-crust px-3.5 py-3 text-text';
</script>

<svelte:head>
	<title>Edit {habit.name} · Looplog</title>
</svelte:head>

<section class="grid gap-4">
	<header>
		<a href="/day" class="inline-flex items-center gap-1 text-blue no-underline">
			<Icon path={mdiChevronLeft} size={20} />
			Back
		</a>
		<h1 class="mt-2 mb-0.5 text-2xl font-bold">Edit habit</h1>
		<p class="m-0 text-subtext-0">
			Step {displayStep} of {totalSteps} · {habitTypeLabel(habit.type)}
		</p>
	</header>

	{#if step === 1}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			<label for="name" class="text-sm text-subtext-1">Name</label>
			<input id="name" bind:value={name} placeholder="Morning ride" required class={inputClass} />

			<p class="text-sm text-subtext-1">Type</p>
			<p class="m-0 rounded-xl border border-surface-0/50 bg-crust px-3.5 py-3.5">
				{habitTypeLabel(habit.type)}
			</p>
		</div>
	{:else if step === 2}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			<p class="text-sm text-subtext-1">Schedule</p>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-full border px-3 py-1.5 {schedulePreset === 'daily'
						? 'border-blue bg-blue/15 text-blue'
						: 'border-surface-0 bg-transparent'}"
					onclick={() => (schedulePreset = 'daily')}>Daily</button
				>
				<button
					type="button"
					class="rounded-full border px-3 py-1.5 {schedulePreset === 'weekdays'
						? 'border-blue bg-blue/15 text-blue'
						: 'border-surface-0 bg-transparent'}"
					onclick={() => (schedulePreset = 'weekdays')}>Weekdays</button
				>
				<button
					type="button"
					class="rounded-full border px-3 py-1.5 {schedulePreset === 'custom'
						? 'border-blue bg-blue/15 text-blue'
						: 'border-surface-0 bg-transparent'}"
					onclick={() => (schedulePreset = 'custom')}>Custom</button
				>
			</div>

			{#if schedulePreset === 'custom'}
				<div class="flex flex-wrap gap-2">
					{#each ALL_DAYS as day (day)}
						<button
							type="button"
							class="rounded-full border px-3 py-1.5 {customDays.includes(day)
								? 'border-blue bg-blue/15 text-blue'
								: 'border-surface-0 bg-transparent'}"
							onclick={() => toggleDay(day)}>{weekdayLabel(day)}</button
						>
					{/each}
				</div>
			{/if}

			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={allowSkip} />
				Allow skip without penalty
			</label>

			{#if allowSkip}
				<label for="max-skips" class="text-sm text-subtext-1">Max consecutive skips</label>
				<input
					id="max-skips"
					type="number"
					min="1"
					bind:value={maxConsecutiveSkips}
					class={inputClass}
				/>
			{/if}
		</div>
	{:else if step === 3}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			{#if habit.type === 'do_target'}
				<label for="target-value" class="text-sm text-subtext-1">Target</label>
				<input
					id="target-value"
					type="number"
					min="1"
					bind:value={targetValue}
					class={inputClass}
				/>
				<label for="target-unit" class="text-sm text-subtext-1">Unit</label>
				<input
					id="target-unit"
					bind:value={targetUnit}
					placeholder="min, pages, km"
					class={inputClass}
				/>
				<label for="log-step" class="text-sm text-subtext-1">Log step (+/− increment)</label>
				<input id="log-step" type="number" min="1" bind:value={logStep} class={inputClass} />
			{:else if habit.type === 'do_on_time'}
				<label for="target-time" class="text-sm text-subtext-1">Target time</label>
				<input id="target-time" type="time" bind:value={targetTime} class={inputClass} />
				<label for="grace" class="text-sm text-subtext-1">Grace window (minutes)</label>
				<input id="grace" type="number" min="0" bind:value={graceMinutes} class={inputClass} />
				<label for="falloff" class="text-sm text-subtext-1"
					>Minutes late for each 10% drop (after grace)</label
				>
				<input id="falloff" type="number" min="1" bind:value={falloffMinutes} class={inputClass} />
				<label for="log-step-time" class="text-sm text-subtext-1">Log step (+/− increment in minutes)</label>
				<input id="log-step-time" type="number" min="1" bind:value={logStep} class={inputClass} />
			{:else if habit.type === 'do_binary'}
				<p class="m-0 text-sm text-subtext-0">
					Log Yes or No each day — 100% or 0% adherence.
				</p>
			{:else}
				<p class="m-0 text-sm text-subtext-0">
					Adherence comes from your 1–5 satisfaction rating when you log.
				</p>
			{/if}
		</div>
	{:else if hasAnchorStep}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={isAnytime} />
				Anytime habit (no anchor time)
			</label>

			{#if !isAnytime}
				<label for="anchor" class="text-sm text-subtext-1">Anchor time</label>
				<input id="anchor" type="time" bind:value={anchorTime} required class={inputClass} />
				<p class="m-0 text-sm text-subtext-0">
					Used for ordering in Focus — not a deadline.
				</p>
			{/if}
		</div>
	{/if}

	<div class="flex gap-3">
		{#if step > 1}
			<button
				type="button"
				class="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border-0 bg-surface-0/50 py-3.5 font-semibold"
				onclick={prevStep}
			>
				<Icon path={mdiChevronLeft} size={20} />
				Back
			</button>
		{/if}
		{#if step < 4 && !isSaveStep}
			<button
				type="button"
				class="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border-0 bg-blue py-3.5 font-semibold text-white disabled:opacity-60"
				disabled={step === 1 && !name.trim()}
				onclick={nextStep}
			>
				Continue
				<Icon path={mdiChevronRight} size={20} />
			</button>
		{:else}
			<button
				type="button"
				class="flex-1 rounded-xl border-0 bg-blue py-3.5 font-semibold text-white disabled:opacity-60"
				disabled={saving || deleting || !name.trim() || (hasAnchorStep && !isAnytime && !anchorTime)}
				onclick={saveHabit}
			>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="text-red">{error}</p>
	{/if}

	<div class="grid gap-2 border-t border-surface-0/50 pt-4">
		<p class="m-0 text-sm text-subtext-1">Danger zone</p>
		<button
			type="button"
			class="rounded-xl border border-red/40 bg-red/10 py-3.5 font-semibold text-red disabled:opacity-60"
			disabled={saving || deleting}
			onclick={deleteHabit}
		>
			{deleting ? 'Deleting…' : 'Delete habit'}
		</button>
	</div>
</section>
