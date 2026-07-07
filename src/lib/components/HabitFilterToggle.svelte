<script lang="ts">
	import { habitFilterOptions } from '$lib/habits/filter';

	type FilterOption = { value: string; label: string };

	let {
		value,
		pendingCounts,
		options = habitFilterOptions,
		onchange
	}: {
		value: string;
		pendingCounts?: Partial<Record<string, number>>;
		options?: readonly FilterOption[];
		onchange: (filter: string) => void;
	} = $props();

	const gridClass = 'grid-cols-3';

	const buttonClass = (active: boolean) =>
		`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
			active ? 'bg-surface-0 text-text shadow-sm' : 'text-subtext-0'
		}`;

	function label(option: (typeof options)[number]) {
		const pending = pendingCounts?.[option.value];
		if (pending == null || pending <= 0) return option.label;
		return `${option.label} · ${pending}`;
	}
</script>

<div
	class="grid {gridClass} gap-1 rounded-xl bg-surface-0/40 p-1"
	role="group"
	aria-label="Habit filter"
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
