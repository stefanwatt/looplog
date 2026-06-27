<script lang="ts">
	import type { Habit } from '$lib/database.types';
	import {
		calculateAdherence,
		canSubmitLog,
		defaultInputForHabit,
		formatTimeLabel,
		nailedItInput,
		previewAdherenceLabel
	} from '$lib/habits/adherence';
	import StarRating from '$lib/components/StarRating.svelte';

	let {
		habit,
		timezone,
		onlog,
		onskip,
		canSkip = false,
		busy = false
	}: {
		habit: Habit;
		timezone: string;
		onlog: (payload: Record<string, unknown>) => Promise<void>;
		onskip?: () => Promise<void>;
		canSkip?: boolean;
		busy?: boolean;
	} = $props();

	const defaults = defaultInputForHabit(habit, timezone);

	let actualValue = $state<number | null>(
		defaults.actualValue ?? (habit.type === 'do_binary' ? null : 0)
	);
	let actualTime = $state((defaults.actualTime ?? '12:00').slice(0, 5));
	let satisfaction = $state(defaults.satisfaction ?? 3);

	let dragX = $state(0);
	let dragging = $state(false);
	let startX = $state(0);

	const previewScore = $derived(
		calculateAdherence(habit, { actualValue, actualTime, satisfaction })
	);

	const canSubmit = $derived(canSubmitLog(habit, { actualValue, actualTime, satisfaction }));

	const transform = $derived(`translateX(${dragX}px) rotate(${dragX * 0.04}deg)`);

	function resetDrag() {
		dragX = 0;
		dragging = false;
	}

	function onPointerDown(event: PointerEvent) {
		if (busy) return;
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

		if (dragX <= -threshold && canSkip && onskip) {
			resetDrag();
			await onskip();
			return;
		}

		if (dragX >= threshold && canSubmit) {
			resetDrag();
			await submit();
			return;
		}

		resetDrag();
	}

	async function submit() {
		switch (habit.type) {
			case 'do_target':
				await onlog({ actualValue });
				break;
			case 'do_binary':
				await onlog({ actualValue });
				break;
			case 'do_on_time':
				await onlog({ actualTime: `${actualTime}:00`.slice(0, 8) });
				break;
			case 'avoid':
			case 'rate':
				await onlog({ satisfaction });
				break;
		}
	}

	async function nailedIt() {
		const input = nailedItInput(habit, timezone);
		actualValue = input.actualValue ?? actualValue;
		actualTime = (input.actualTime ?? actualTime).slice(0, 5);
		satisfaction = input.satisfaction ?? satisfaction;
		await submit();
	}
</script>

<div
	class="card"
	role="group"
	aria-label="{habit.name} logging card"
	style:transform
	style:touch-action="pan-y"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<div class="card__header">
		<p class="card__time">{formatTimeLabel(habit.anchor_time)}</p>
		<h2 class="card__title">{habit.name}</h2>
	</div>

	<div class="card__body">
		{#if habit.type === 'do_target'}
			<label class="card__label" for="value-{habit.id}">
				{actualValue} / {habit.target_value} {habit.target_unit}
			</label>
			<input
				id="value-{habit.id}"
				type="range"
				min="0"
				max={Number(habit.target_value) * 1.5}
				step="1"
				bind:value={actualValue}
				disabled={busy}
			/>
		{:else if habit.type === 'do_binary'}
			<p class="card__label">Did you do it?</p>
			<div class="card__binary">
				<button
					type="button"
					class="card__binary-btn"
					class:card__binary-btn--active={actualValue === 1}
					disabled={busy}
					onclick={() => (actualValue = 1)}
				>
					Yes
				</button>
				<button
					type="button"
					class="card__binary-btn"
					class:card__binary-btn--active={actualValue === 0}
					disabled={busy}
					onclick={() => (actualValue = 0)}
				>
					No
				</button>
			</div>
		{:else if habit.type === 'do_on_time'}
			<label class="card__label" for="time-{habit.id}">Actual time</label>
			<input id="time-{habit.id}" type="time" bind:value={actualTime} disabled={busy} />
			<p class="card__hint">Target {formatTimeLabel(habit.target_time)}</p>
		{:else}
			<p class="card__label">How did you do?</p>
			<StarRating bind:value={satisfaction} disabled={busy} />
		{/if}
	</div>

	<div class="card__preview">
		{#if habit.type === 'do_binary' && actualValue == null}
			<span class="card__label-text">Pick Yes or No</span>
		{:else}
			<span class="card__score">{previewScore}%</span>
			<span class="card__label-text">{previewAdherenceLabel(previewScore)}</span>
		{/if}
	</div>

	<div class="card__actions">
		{#if habit.type === 'do_target' || habit.type === 'do_on_time'}
			<button type="button" class="card__secondary" disabled={busy} onclick={nailedIt}>
				Nailed it
			</button>
		{/if}
		<button type="button" class="card__primary" disabled={busy || !canSubmit} onclick={submit}>
			Log
		</button>
		{#if canSkip}
			<button type="button" class="card__ghost" disabled={busy} onclick={() => onskip?.()}>
				Skip
			</button>
		{/if}
	</div>

	<p class="card__gestures">Swipe right to log · swipe left to skip</p>
</div>

<style>
	.card {
		border-radius: 1.25rem;
		padding: 1.25rem;
		background: linear-gradient(180deg, #172033 0%, #121821 100%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
		transition: transform 0.15s ease;
		user-select: none;
	}

	.card__header {
		margin-bottom: 1.25rem;
	}

	.card__time {
		margin: 0;
		font-size: 0.85rem;
		color: #7dd3fc;
		font-weight: 600;
	}

	.card__title {
		margin: 0.35rem 0 0;
		font-size: 1.6rem;
	}

	.card__body {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.card__label,
	.card__hint {
		margin: 0;
		color: #b8c2cf;
	}

	.card__preview {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.card__score {
		font-size: 2rem;
		font-weight: 700;
	}

	.card__label-text {
		color: #8b98a8;
	}

	.card__actions {
		display: grid;
		gap: 0.5rem;
	}

	.card__primary,
	.card__secondary,
	.card__ghost {
		border-radius: 0.85rem;
		padding: 0.85rem 1rem;
		font-weight: 600;
		border: 0;
	}

	.card__primary {
		background: #0284c7;
		color: white;
	}

	.card__secondary {
		background: rgba(125, 211, 252, 0.12);
		color: #7dd3fc;
	}

	.card__ghost {
		background: transparent;
		color: #94a3b8;
	}

	.card__primary:disabled,
	.card__secondary:disabled,
	.card__ghost:disabled {
		opacity: 0.5;
	}

	.card__gestures {
		margin: 1rem 0 0;
		text-align: center;
		font-size: 0.75rem;
		color: #64748b;
	}

	input[type='range'],
	input[type='time'] {
		width: 100%;
	}

	.card__binary {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.card__binary-btn {
		border-radius: 0.85rem;
		padding: 0.85rem 1rem;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #0b0f14;
		color: inherit;
	}

	.card__binary-btn--active {
		border-color: #0284c7;
		background: rgba(2, 132, 199, 0.18);
		color: #7dd3fc;
	}

	.card__binary-btn:disabled {
		opacity: 0.5;
	}
</style>
