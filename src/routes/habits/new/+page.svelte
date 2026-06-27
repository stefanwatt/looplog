<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import type { HabitType } from '$lib/database.types';
	import {
		DEFAULT_MAX_SKIPS,
		defaultScoringForType,
		habitTypeHasConfigStep
	} from '$lib/habits/defaults';
	import { presetToDays, type SchedulePreset, weekdayLabel, ALL_DAYS } from '$lib/habits/schedule';
	import { createHabit } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';
	import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';

	const types: { value: HabitType; label: string; hint: string }[] = [
		{ value: 'do_target', label: 'Do (target)', hint: 'Track amount vs a target' },
		{ value: 'do_on_time', label: 'Do (on time)', hint: 'Wake up, start work, etc.' },
		{ value: 'do_binary', label: 'Do (binary)', hint: 'Simple yes/no habits' },
		{ value: 'avoid', label: 'Avoid', hint: 'Rate how well you avoided it' },
		{ value: 'rate', label: 'Rate', hint: 'Subjective satisfaction only' }
	];

	let step = $state(1);
	let saving = $state(false);
	let error = $state('');

	let name = $state('');
	let type = $state<HabitType>('do_target');
	let schedulePreset = $state<SchedulePreset>('daily');
	let customDays = $state<number[]>([1, 3, 5]);
	let allowSkip = $state(false);
	let maxConsecutiveSkips = $state(DEFAULT_MAX_SKIPS);

	let targetValue = $state(60);
	let targetUnit = $state('min');
	let targetTime = $state('06:00');
	let graceMinutes = $state(5);
	let falloffMinutes = $state(6);

	let anchorTime = $state('');
	let isAnytime = $state(false);

	const hasConfigStep = $derived(habitTypeHasConfigStep(type));
	const totalSteps = $derived(hasConfigStep ? 4 : 3);
	const displayStep = $derived(step === 4 && !hasConfigStep ? 3 : step);

	function nextStep() {
		if (step === 2 && !hasConfigStep) {
			step = 4;
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

			const scoring = defaultScoringForType(type);
			const activeDays = presetToDays(
				schedulePreset,
				schedulePreset === 'custom' ? customDays : undefined
			);

			await createHabit(supabase, user.id, {
				name: name.trim(),
				type,
				active_days: activeDays,
				allow_skip: allowSkip,
				max_consecutive_skips: maxConsecutiveSkips,
				anchor_time: isAnytime || !anchorTime ? null : `${anchorTime}:00`,
				target_value: type === 'do_target' ? targetValue : null,
				target_unit: type === 'do_target' ? targetUnit : null,
				target_time: type === 'do_on_time' ? `${targetTime}:00` : null,
				grace_minutes: type === 'do_on_time' ? graceMinutes : scoring.grace_minutes,
				falloff_minutes_per_10_percent:
					type === 'do_on_time' ? falloffMinutes : scoring.falloff_minutes_per_10_percent
			});

			await goto('/next');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not create habit';
		} finally {
			saving = false;
		}
	}

	const inputClass =
		'w-full rounded-xl border border-surface-0 bg-crust px-3.5 py-3 text-text';
</script>

<svelte:head>
	<title>New habit · Looplog</title>
</svelte:head>

<section class="grid gap-4">
	<header>
		<a href="/next" class="inline-flex items-center gap-1 text-blue no-underline">
			<Icon path={mdiChevronLeft} size={20} />
			Back
		</a>
		<h1 class="mt-2 mb-0.5 text-2xl font-bold">New habit</h1>
		<p class="m-0 text-subtext-0">Step {displayStep} of {totalSteps}</p>
	</header>

	{#if step === 1}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			<label for="name" class="text-sm text-subtext-1">Name</label>
			<input id="name" bind:value={name} placeholder="Morning ride" required class={inputClass} />

			<p class="text-sm text-subtext-1">Type</p>
			<div class="grid gap-2">
				{#each types as option (option.value)}
					<button
						type="button"
						class="rounded-xl border px-3.5 py-3.5 text-left {type === option.value
							? 'border-blue bg-blue/10'
							: 'border-surface-0/50 bg-crust'}"
						onclick={() => (type = option.value)}
					>
						<strong>{option.label}</strong>
						<span class="mt-0.5 block text-sm text-subtext-0">{option.hint}</span>
					</button>
				{/each}
			</div>
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
			{#if type === 'do_target'}
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
			{:else if type === 'do_on_time'}
				<label for="target-time" class="text-sm text-subtext-1">Target time</label>
				<input id="target-time" type="time" bind:value={targetTime} class={inputClass} />
				<label for="grace" class="text-sm text-subtext-1">Grace window (minutes)</label>
				<input id="grace" type="number" min="0" bind:value={graceMinutes} class={inputClass} />
				<label for="falloff" class="text-sm text-subtext-1"
					>Minutes late for each 10% drop (after grace)</label
				>
				<input id="falloff" type="number" min="1" bind:value={falloffMinutes} class={inputClass} />
			{:else if type === 'do_binary'}
				<p class="m-0 text-sm text-subtext-0">
					Log Yes or No each day — 100% or 0% adherence.
				</p>
			{:else}
				<p class="m-0 text-sm text-subtext-0">
					Adherence comes from your 1–5 satisfaction rating when you log.
				</p>
			{/if}
		</div>
	{:else}
		<div class="grid gap-3 rounded-2xl bg-surface-0/40 p-4">
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={isAnytime} />
				Anytime habit (no anchor time)
			</label>

			{#if !isAnytime}
				<label for="anchor" class="text-sm text-subtext-1">Anchor time</label>
				<input id="anchor" type="time" bind:value={anchorTime} required class={inputClass} />
				<p class="m-0 text-sm text-subtext-0">
					Used for ordering in Next — not a deadline.
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
		{#if step < 4}
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
				disabled={saving || !name.trim() || (!isAnytime && !anchorTime)}
				onclick={saveHabit}
			>
				{saving ? 'Saving…' : 'Create habit'}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="text-red">{error}</p>
	{/if}
</section>
