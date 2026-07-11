<script lang="ts">
	export type SegmentedOption = { value: string; label: string };

	let {
		value,
		options,
		badges,
		columns = 3,
		ariaLabel = 'Options',
		onchange
	}: {
		value: string;
		options: readonly SegmentedOption[];
		badges?: Partial<Record<string, number>>;
		columns?: number;
		ariaLabel?: string;
		onchange: (value: string) => void;
	} = $props();

	const gridClass = $derived(columns === 2 ? 'grid-cols-2' : 'grid-cols-3');

	const buttonClass = (active: boolean) =>
		`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
			active ? 'bg-surface-0 text-text shadow-sm' : 'text-subtext-0'
		}`;

	function label(option: SegmentedOption) {
		const badge = badges?.[option.value];
		if (badge == null || badge <= 0) return option.label;
		return `${option.label} · ${badge}`;
	}
</script>

<div
	class="grid {gridClass} gap-1 rounded-xl bg-surface-0/40 p-1"
	role="group"
	aria-label={ariaLabel}
>
	{#each options as option (option.value)}
		<button
			type="button"
			class={buttonClass(value === option.value)}
			aria-pressed={value === option.value}
			onclick={() => onchange(option.value)}
		>
			{label(option)}
		</button>
	{/each}
</div>
