<script lang="ts">
	let { value = $bindable(3), disabled = false } = $props();
</script>

<div class="stars" role="radiogroup" aria-label="Satisfaction">
	{#each [1, 2, 3, 4, 5] as star}
		<button
			type="button"
			class="stars__button"
			class:stars__button--active={star <= value}
			aria-label="{star} star"
			aria-pressed={star <= value}
			{disabled}
			onclick={() => (value = star)}
		>
			★
		</button>
	{/each}
</div>

<style>
	.stars {
		display: flex;
		gap: 0.35rem;
		justify-content: center;
	}

	.stars__button {
		border: 0;
		background: transparent;
		font-size: 2rem;
		line-height: 1;
		color: #334155;
		padding: 0.15rem;
	}

	.stars__button--active {
		color: #fbbf24;
	}
</style>
