<script lang="ts">
	import type { CardStampVariant } from '$lib/habits/card-action-animation';

	let {
		label,
		variant = 'yellow'
	}: {
		label: string;
		variant?: CardStampVariant;
	} = $props();

	const variantClass = $derived(
		{
			yellow: 'border-yellow text-yellow',
			green: 'border-green text-green',
			red: 'border-red text-red'
		}[variant]
	);
</script>

<div
	class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
	aria-hidden="true"
>
	<div
		class="card-action-stamp rounded-xl border-[5px] bg-surface-1/70 px-5 py-3 text-3xl font-black tracking-wide uppercase {variantClass}"
	>
		{label}
	</div>
</div>

<style>
	.card-action-stamp {
		transform: rotate(-14deg);
		animation: card-stamp-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes card-stamp-in {
		0% {
			opacity: 0;
			transform: rotate(-14deg) scale(1.85);
		}

		65% {
			opacity: 1;
			transform: rotate(-14deg) scale(0.94);
		}

		100% {
			opacity: 1;
			transform: rotate(-14deg) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card-action-stamp {
			animation: none;
			opacity: 1;
		}
	}
</style>
