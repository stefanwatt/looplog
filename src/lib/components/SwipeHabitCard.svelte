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
	import { mdiCheck, mdiClose, mdiPencil, mdiSkipNext, mdiTrophy } from '@mdi/js';

	let {
		habit,
		timezone,
		onlog,
		onskip,
		canSkip = false,
		busy = false,
		interactive = true,
		dragX = $bindable(0),
		dragging = $bindable(false)
	}: {
		habit: Habit;
		timezone: string;
		onlog?: (payload: Record<string, unknown>) => Promise<void>;
		onskip?: () => Promise<void>;
		canSkip?: boolean;
		busy?: boolean;
		interactive?: boolean;
		dragX?: number;
		dragging?: boolean;
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

	let startX = $state(0);

	const previewScore = $derived(
		calculateAdherence(habit, { actualValue, actualTime, satisfaction })
	);

	const canSubmit = $derived(canSubmitLog(habit, { actualValue, actualTime, satisfaction }));

	const transform = $derived(
		interactive ? `translateX(${dragX}px) rotate(${dragX * 0.04}deg)` : undefined
	);

	function resetDrag() {
		dragX = 0;
		dragging = false;
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
		if (!onlog) return;

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
	class="select-none rounded-2xl border border-surface-0/50 bg-surface-1 p-5 shadow-xl shadow-crust/50"
	role="group"
	aria-label="{habit.name} logging card"
	style:transform
	style:transition={interactive && !dragging ? 'transform 200ms ease-out' : 'none'}
	style:touch-action={interactive ? 'pan-y' : undefined}
	onpointerdown={interactive ? onPointerDown : undefined}
	onpointermove={interactive ? onPointerMove : undefined}
	onpointerup={interactive ? onPointerUp : undefined}
	onpointercancel={interactive ? onPointerUp : undefined}
>
	<div class="mb-5 flex items-start justify-between gap-3">
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
				<Icon path={mdiTrophy} size={20} />
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

	{#if interactive}
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
	{/if}
</div>
