<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { mdiStar, mdiStarOutline } from '@mdi/js';

	let { value = $bindable<number | null>(null), disabled = false, onselect }: {
		value?: number | null;
		disabled?: boolean;
		onselect?: () => void;
	} = $props();
</script>

<div class="flex justify-center gap-1.5" role="radiogroup" aria-label="Satisfaction">
	{#each [1, 2, 3, 4, 5] as star (star)}
		<button
			type="button"
			class="border-0 bg-transparent p-0.5 {value != null && star <= value
				? 'text-yellow'
				: 'text-surface-2'}"
			aria-label="{star} star"
			aria-pressed={value != null && star <= value}
			{disabled}
			onclick={() => {
				value = star;
				onselect?.();
			}}
		>
			<Icon path={value != null && star <= value ? mdiStar : mdiStarOutline} size={32} />
		</button>
	{/each}
</div>
