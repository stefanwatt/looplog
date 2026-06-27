<script lang="ts">
	import { habitFilterOptions, type HabitFilter } from '$lib/habits/filter';

	let {
		value,
		onchange
	}: {
		value: HabitFilter;
		onchange: (filter: HabitFilter) => void;
	} = $props();

	const buttonClass = (active: boolean) =>
		`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
			active ? 'bg-surface-0 text-text shadow-sm' : 'text-subtext-0'
		}`;
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
			{option.label}
		</button>
	{/each}
</div>
