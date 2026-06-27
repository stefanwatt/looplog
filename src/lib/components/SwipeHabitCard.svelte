<script lang="ts">
	import type { Habit } from '$lib/database.types';
	import {
		calculateAdherence,
		canSubmitLog,
		formatTimeLabel,
		nailedItInput,
		previewAdherenceLabel
	} from '$lib/habits/adherence';
	import Icon from '$lib/components/Icon.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { mdiCheck, mdiClose, mdiSkipNext } from '@mdi/js';

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

	let actualValue = $state<number | null>(null);
	let actualTime = $state('12:00');
	let satisfaction = $state(3);

	$effect(() => {
		const input = nailedItInput(habit, timezone);
		actualValue =
			habit.type === 'do_binary' ? null : (input.actualValue ?? 0);
		actualTime = (input.actualTime ?? '12:00').slice(0, 5);
		satisfaction = input.satisfaction ?? 3;
	});

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
	class="select-none rounded-2xl border border-surface-0/50 bg-linear-to-b from-surface-1 to-surface-0/40 p-5 shadow-xl shadow-crust/50 transition-transform duration-150"
	role="group"
	aria-label="{habit.name} logging card"
	style:transform
	style:touch-action="pan-y"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<div class="mb-5">
		<p class="m-0 text-sm font-semibold text-blue">{formatTimeLabel(habit.anchor_time)}</p>
		<h2 class="mt-1.5 mb-0 text-2xl font-bold">{habit.name}</h2>
	</div>

	<div class="mb-4 grid gap-3">
		{#if habit.type === 'do_target'}
			<label class="m-0 text-subtext-1" for="value-{habit.id}">
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
				class="w-full accent-blue"
			/>
		{:else if habit.type === 'do_binary'}
			<p class="m-0 text-subtext-1">Did you do it?</p>
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					class="rounded-xl border px-4 py-3.5 font-semibold disabled:opacity-50 {actualValue === 1
						? 'border-blue bg-blue/15 text-blue'
						: 'border-surface-0 bg-crust text-text'}"
					disabled={busy}
					onclick={() => (actualValue = 1)}
				>
					Yes
				</button>
				<button
					type="button"
					class="rounded-xl border px-4 py-3.5 font-semibold disabled:opacity-50 {actualValue === 0
						? 'border-red bg-red/15 text-red'
						: 'border-surface-0 bg-crust text-text'}"
					disabled={busy}
					onclick={() => (actualValue = 0)}
				>
					No
				</button>
			</div>
		{:else if habit.type === 'do_on_time'}
			<label class="m-0 text-subtext-1" for="time-{habit.id}">Actual time</label>
			<input
				id="time-{habit.id}"
				type="time"
				bind:value={actualTime}
				disabled={busy}
				class="w-full rounded-xl border border-surface-0 bg-crust px-3 py-2"
			/>
			<p class="m-0 text-subtext-1">Target {formatTimeLabel(habit.target_time)}</p>
		{:else}
			<p class="m-0 text-subtext-1">How did you do?</p>
			<StarRating bind:value={satisfaction} disabled={busy} />
		{/if}
	</div>

	<div class="mb-4 flex items-baseline gap-2">
		{#if habit.type === 'do_binary' && actualValue == null}
			<span class="text-subtext-0">Pick Yes or No</span>
		{:else}
			<span class="text-3xl font-bold">{previewScore}%</span>
			<span class="text-subtext-0">{previewAdherenceLabel(previewScore)}</span>
		{/if}
	</div>

	<div class="grid gap-2">
		{#if habit.type === 'do_target' || habit.type === 'do_on_time'}
			<button
				type="button"
				class="inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-blue/15 py-3.5 font-semibold text-blue disabled:opacity-50"
				disabled={busy}
				onclick={nailedIt}
			>
				<Icon path={mdiCheck} size={20} />
				Nailed it
			</button>
		{/if}
		<button
			type="button"
			class="inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-blue py-3.5 font-semibold text-crust disabled:opacity-50"
			disabled={busy || !canSubmit}
			onclick={submit}
		>
			<Icon path={mdiCheck} size={20} />
			Log
		</button>
		{#if canSkip}
			<button
				type="button"
				class="inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-transparent py-3.5 font-semibold text-overlay-0 disabled:opacity-50"
				disabled={busy}
				onclick={() => onskip?.()}
			>
				<Icon path={mdiSkipNext} size={20} />
				Skip
			</button>
		{/if}
	</div>

	<p class="mt-4 mb-0 flex items-center justify-center gap-3 text-center text-xs text-overlay-0">
		<span class="inline-flex items-center gap-1 text-green">
			<Icon path={mdiCheck} size={14} />
			swipe right to log
		</span>
		{#if canSkip}
			<span class="inline-flex items-center gap-1 text-red">
				<Icon path={mdiClose} size={14} />
				swipe left to skip
			</span>
		{/if}
	</p>
</div>
