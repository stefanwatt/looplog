<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { QuickOption } from '$lib/habits/log-input';
	import { mdiMinus, mdiPlus } from '@mdi/js';

	let {
		value = $bindable<number | null>(null),
		step,
		baseline,
		min = 0,
		max,
		quickOptions,
		formatDisplay,
		disabled = false,
		ariaLabel,
		onselect
	}: {
		value?: number | null;
		step: number;
		baseline: number;
		min?: number;
		max?: number;
		quickOptions: QuickOption[];
		formatDisplay: (value: number) => string;
		disabled?: boolean;
		ariaLabel: string;
		onselect?: () => void;
	} = $props();

	const displayText = $derived(value == null ? '—' : formatDisplay(value));

	function clamp(valueToClamp: number): number {
		const upper = max ?? Number.POSITIVE_INFINITY;
		return Math.max(min, Math.min(upper, valueToClamp));
	}

	function currentOrBaseline(): number {
		return value ?? baseline;
	}

	function setValue(next: number) {
		value = clamp(next);
		onselect?.();
	}

	function adjust(delta: number) {
		setValue(currentOrBaseline() + delta);
	}

	function stopSwipe(event: PointerEvent) {
		event.stopPropagation();
	}

	const quickButtonClass =
		'min-w-0 flex-1 truncate rounded-xl border border-surface-0/60 bg-surface-0/30 px-2 py-2 text-sm font-medium text-text transition enabled:active:scale-95 disabled:opacity-40';
	const stepButtonClass =
		'grid size-11 shrink-0 place-items-center rounded-full border border-surface-0/60 bg-surface-0/40 text-text transition enabled:active:scale-95 disabled:opacity-40';
</script>

<div class="grid gap-3" role="group" aria-label={ariaLabel} onpointerdown={stopSwipe}>
	<div class="flex flex-nowrap gap-1.5">
		{#each quickOptions as option (option.value)}
			<button
				type="button"
				class="{quickButtonClass} {value === option.value ? 'border-blue bg-blue/15 text-blue' : ''}"
				{disabled}
				aria-pressed={value === option.value}
				onclick={() => setValue(option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>

	<div class="flex items-center justify-center gap-3">
		<button
			type="button"
			class={stepButtonClass}
			{disabled}
			aria-label="Decrease by {step}"
			onclick={() => adjust(-step)}
		>
			<Icon path={mdiMinus} size={20} />
		</button>

		<p class="m-0 min-w-0 flex-1 text-center text-xl font-semibold tabular-nums">{displayText}</p>

		<button
			type="button"
			class={stepButtonClass}
			{disabled}
			aria-label="Increase by {step}"
			onclick={() => adjust(step)}
		>
			<Icon path={mdiPlus} size={20} />
		</button>
	</div>
</div>
