<script lang="ts">
	import { goto } from '$app/navigation';
	import type { HabitType } from '$lib/database.types';
	import { DEFAULT_MAX_SKIPS, defaultScoringForType } from '$lib/habits/defaults';
	import { presetToDays, type SchedulePreset, weekdayLabel, ALL_DAYS } from '$lib/habits/schedule';
	import { createHabit } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';

	const types: { value: HabitType; label: string; hint: string }[] = [
		{ value: 'do_target', label: 'Do (target)', hint: 'Track amount vs a target' },
		{ value: 'do_on_time', label: 'Do (on time)', hint: 'Wake up, start work, etc.' },
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

	function nextStep() {
		step = Math.min(4, step + 1);
	}

	function prevStep() {
		step = Math.max(1, step - 1);
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
</script>

<svelte:head>
	<title>New habit · Looplog</title>
</svelte:head>

<section class="wizard">
	<header>
		<a href="/next">← Back</a>
		<h1>New habit</h1>
		<p>Step {step} of 4</p>
	</header>

	{#if step === 1}
		<div class="panel">
			<label for="name">Name</label>
			<input id="name" bind:value={name} placeholder="Morning ride" required />

			<p class="label">Type</p>
			<div class="choices">
				{#each types as option}
					<button
						type="button"
						class="choice"
						class:choice--active={type === option.value}
						onclick={() => (type = option.value)}
					>
						<strong>{option.label}</strong>
						<span>{option.hint}</span>
					</button>
				{/each}
			</div>
		</div>
	{:else if step === 2}
		<div class="panel">
			<p class="label">Schedule</p>
			<div class="segmented">
				<button
					type="button"
					class:active={schedulePreset === 'daily'}
					onclick={() => (schedulePreset = 'daily')}>Daily</button
				>
				<button
					type="button"
					class:active={schedulePreset === 'weekdays'}
					onclick={() => (schedulePreset = 'weekdays')}>Weekdays</button
				>
				<button
					type="button"
					class:active={schedulePreset === 'custom'}
					onclick={() => (schedulePreset = 'custom')}>Custom</button
				>
			</div>

			{#if schedulePreset === 'custom'}
				<div class="days">
					{#each ALL_DAYS as day}
						<button
							type="button"
							class:active={customDays.includes(day)}
							onclick={() => toggleDay(day)}>{weekdayLabel(day)}</button
						>
					{/each}
				</div>
			{/if}

			<label class="checkbox">
				<input type="checkbox" bind:checked={allowSkip} />
				Allow skip without penalty
			</label>

			{#if allowSkip}
				<label for="max-skips">Max consecutive skips</label>
				<input id="max-skips" type="number" min="1" bind:value={maxConsecutiveSkips} />
			{/if}
		</div>
	{:else if step === 3}
		<div class="panel">
			{#if type === 'do_target'}
				<label for="target-value">Target</label>
				<input id="target-value" type="number" min="1" bind:value={targetValue} />
				<label for="target-unit">Unit</label>
				<input id="target-unit" bind:value={targetUnit} placeholder="min, pages, km" />
			{:else if type === 'do_on_time'}
				<label for="target-time">Target time</label>
				<input id="target-time" type="time" bind:value={targetTime} />
				<label for="grace">Grace window (minutes)</label>
				<input id="grace" type="number" min="0" bind:value={graceMinutes} />
				<label for="falloff">Minutes late for each 10% drop (after grace)</label>
				<input id="falloff" type="number" min="1" bind:value={falloffMinutes} />
			{:else}
				<p class="hint">Adherence comes from your 1–5 satisfaction rating when you log.</p>
			{/if}
		</div>
	{:else}
		<div class="panel">
			<label class="checkbox">
				<input type="checkbox" bind:checked={isAnytime} />
				Anytime habit (no anchor time)
			</label>

			{#if !isAnytime}
				<label for="anchor">Anchor time</label>
				<input id="anchor" type="time" bind:value={anchorTime} required />
				<p class="hint">Used for ordering in Next — not a deadline.</p>
			{/if}
		</div>
	{/if}

	<div class="actions">
		{#if step > 1}
			<button type="button" class="secondary" onclick={prevStep}>Back</button>
		{/if}
		{#if step < 4}
			<button type="button" class="primary" disabled={step === 1 && !name.trim()} onclick={nextStep}>
				Continue
			</button>
		{:else}
			<button
				type="button"
				class="primary"
				disabled={saving || !name.trim() || (!isAnytime && !anchorTime)}
				onclick={saveHabit}
			>
				{saving ? 'Saving…' : 'Create habit'}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}
</section>

<style>
	.wizard {
		display: grid;
		gap: 1rem;
	}

	header a {
		color: #7dd3fc;
		text-decoration: none;
	}

	header h1 {
		margin: 0.5rem 0 0.15rem;
	}

	header p {
		margin: 0;
		color: #8b98a8;
	}

	.panel {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 1rem;
		background: #121821;
	}

	label,
	.label {
		font-size: 0.85rem;
		color: #b8c2cf;
	}

	input[type='text'],
	input[type='number'],
	input[type='time'] {
		width: 100%;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #0b0f14;
		color: inherit;
		padding: 0.75rem 0.85rem;
	}

	.choices {
		display: grid;
		gap: 0.5rem;
	}

	.choice {
		text-align: left;
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #0b0f14;
		color: inherit;
		padding: 0.85rem;
	}

	.choice--active {
		border-color: #0284c7;
		background: rgba(2, 132, 199, 0.12);
	}

	.choice span {
		display: block;
		margin-top: 0.2rem;
		color: #8b98a8;
		font-size: 0.85rem;
	}

	.segmented,
	.days {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.segmented button,
	.days button {
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: transparent;
		color: inherit;
		padding: 0.45rem 0.8rem;
	}

	.segmented button.active,
	.days button.active {
		background: rgba(2, 132, 199, 0.18);
		border-color: #0284c7;
		color: #7dd3fc;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.hint {
		margin: 0;
		color: #8b98a8;
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.primary,
	.secondary {
		flex: 1;
		border-radius: 0.85rem;
		padding: 0.85rem 1rem;
		font-weight: 600;
		border: 0;
	}

	.primary {
		background: #0284c7;
		color: white;
	}

	.secondary {
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
	}

	.error {
		color: #fca5a5;
	}
</style>
