<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { mdiStar, mdiStarOutline } from '@mdi/js';

	let { value = $bindable(3), disabled = false } = $props();
</script>

<div class="flex justify-center gap-1.5" role="radiogroup" aria-label="Satisfaction">
	{#each [1, 2, 3, 4, 5] as star (star)}
		<button
			type="button"
			class="border-0 bg-transparent p-0.5 {star <= value ? 'text-yellow' : 'text-surface-2'}"
			aria-label="{star} star"
			aria-pressed={star <= value}
			{disabled}
			onclick={() => (value = star)}
		>
			<Icon path={star <= value ? mdiStar : mdiStarOutline} size={32} />
		</button>
	{/each}
</div>
