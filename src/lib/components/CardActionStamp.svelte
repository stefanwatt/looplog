<script lang="ts">
	import type { CardStampVariant } from '$lib/habits/card-action-animation';

	let {
		label,
		variant = 'yellow',
		mode = 'commit',
		progress = 1,
		align = 'center'
	}: {
		label: string;
		variant?: CardStampVariant;
		mode?: 'commit' | 'preview';
		progress?: number;
		align?: 'center' | 'left' | 'right';
	} = $props();

	const variantClass = $derived(
		{
			yellow: 'border-yellow text-yellow',
			green: 'border-green text-green',
			red: 'border-red text-red'
		}[variant]
	);

	const containerClass = $derived(
		{
			center: 'items-center justify-center',
			left: 'items-start justify-start pt-8 pl-6',
			right: 'items-start justify-end pt-8 pr-6'
		}[align]
	);

	const previewRotation = $derived(align === 'right' ? '14deg' : '-14deg');
	const previewScale = $derived(0.82 + progress * 0.18);
	const previewStyle = $derived(
		mode === 'preview'
			? `opacity: ${progress}; transform: rotate(${previewRotation}) scale(${previewScale});`
			: undefined
	);
</script>

<div
	class="pointer-events-none absolute inset-0 z-20 flex {containerClass}"
	aria-hidden="true"
>
	<div
		class="card-action-stamp rounded-xl border-[5px] bg-surface-1/70 px-5 py-3 text-3xl font-black tracking-wide uppercase {variantClass} {mode ===
		'commit'
			? 'card-action-stamp--commit'
			: 'card-action-stamp--preview'}"
		style={previewStyle}
	>
		{label}
	</div>
</div>

<style>
	.card-action-stamp--commit {
		transform: rotate(-14deg);
		animation: card-stamp-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.card-action-stamp--preview {
		transition: opacity 80ms linear;
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
		.card-action-stamp--commit {
			animation: none;
			opacity: 1;
		}

		.card-action-stamp--preview {
			transition: none;
		}
	}
</style>
