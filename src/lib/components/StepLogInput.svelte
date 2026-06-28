<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { QuickOption, QuickOptionIcon } from '$lib/habits/log-input';
	import { mdiBullseyeArrow, mdiClockOutline, mdiMinus, mdiPlus } from '@mdi/js';

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
		onselect,
		controlsLeading,
		controlsTrailing
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
		controlsLeading?: Snippet;
		controlsTrailing?: Snippet;
	} = $props();

	const quickOptionIcons: Record<QuickOptionIcon, string> = {
		exact: mdiBullseyeArrow,
		now: mdiClockOutline
	};

	const displayText = $derived(value == null ? '—' : formatDisplay(value));
	const hasQuickOptions = $derived(quickOptions.length > 0);

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
		'flex min-w-0 flex-1 items-center justify-center rounded-lg border border-surface-0/60 bg-surface-0/30 px-0.5 py-1.5 text-[10px] font-medium leading-none text-text transition enabled:active:scale-95 disabled:opacity-40';
	const stepButtonClass =
		'grid size-8 shrink-0 place-items-center rounded-full border border-surface-0/60 bg-surface-0/40 text-text transition enabled:active:scale-95 disabled:opacity-40';
</script>

<div class="grid gap-2" role="group" aria-label={ariaLabel} onpointerdown={stopSwipe}>
	{#if hasQuickOptions}
		<div class="flex gap-1">
			{#each quickOptions as option (option.value)}
				<button
					type="button"
					class="{quickButtonClass} {value === option.value ? 'border-blue bg-blue/15 text-blue' : ''}"
					{disabled}
					aria-label={option.label}
					aria-pressed={value === option.value}
					onclick={() => setValue(option.value)}
				>
					{#if option.icon}
						<Icon path={quickOptionIcons[option.icon]} size={14} />
					{:else}
						<span class="truncate tabular-nums">{option.label}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex justify-center">
		<div
			class="grid w-full max-w-xs items-center gap-1 {controlsLeading || controlsTrailing
				? 'grid-cols-[1fr_auto_1fr]'
				: 'grid-cols-1 justify-items-center'}"
		>
			{#if controlsLeading || controlsTrailing}
				<div class="flex justify-end pr-1">
					{#if controlsLeading}
						{@render controlsLeading()}
					{/if}
				</div>
			{/if}

			<div class="flex items-center gap-1">
				<button
					type="button"
					class={stepButtonClass}
					{disabled}
					aria-label="Decrease by {step}"
					onclick={() => adjust(-step)}
				>
					<Icon path={mdiMinus} size={16} />
				</button>

				<p class="m-0 min-w-[2.5rem] text-center text-[1rem] font-semibold leading-tight text-text tabular-nums">
					{displayText}
				</p>

				<button
					type="button"
					class={stepButtonClass}
					{disabled}
					aria-label="Increase by {step}"
					onclick={() => adjust(step)}
				>
					<Icon path={mdiPlus} size={16} />
				</button>
			</div>

			{#if controlsLeading || controlsTrailing}
				<div class="flex justify-start pl-1">
					{#if controlsTrailing}
						{@render controlsTrailing()}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
