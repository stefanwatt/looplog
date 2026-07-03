<script lang="ts">
	import { habitFilterOptions, type HabitFilter } from '$lib/habits/filter';

	let {
		value,
		pendingCounts,
		onchange
	}: {
		value: HabitFilter;
		pendingCounts?: Partial<Record<HabitFilter, number>>;
		onchange: (filter: HabitFilter) => void;
	} = $props();

	const buttonClass = (active: boolean) =>
		`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
			active ? 'bg-surface-0 text-text shadow-sm' : 'text-subtext-0'
		}`;

	function label(option: (typeof habitFilterOptions)[number]) {
		const pending = pendingCounts?.[option.value];
		if (pending == null || pending <= 0) return option.label;
		return `${option.label} · ${pending}`;
	}
</script>

<div
	class="grid grid-cols-3 gap-1 rounded-xl bg-surface-0/40 p-1"
	role="group"
	aria-label="Habit filter"
>
	{#each habitFilterOptions as option (option.value)}
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
