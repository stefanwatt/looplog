<script lang="ts">
	import { onMount } from 'svelte';

	const DURATION_MS = 2800;
	const PARTICLE_COUNT = 28;

	let { onfinish }: { onfinish?: () => void } = $props();

	const colors = [
		'var(--ctp-green)',
		'var(--ctp-yellow)',
		'var(--ctp-blue)',
		'var(--ctp-pink)',
		'var(--ctp-peach)',
		'var(--ctp-teal)',
		'var(--ctp-mauve)',
		'var(--ctp-sapphire)'
	];

	const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
		id: i,
		left: `${(i * 37 + 11) % 94 + 3}%`,
		delay: `${(i * 43) % 320}ms`,
		duration: `${1200 + (i * 61) % 800}ms`,
		drift: `${((i * 17) % 7) - 3}rem`,
		color: colors[i % colors.length]!,
		size: 5 + (i % 4) * 2,
		shape: i % 3,
		spin: `${(i * 53) % 720 - 360}deg`
	}));

	onMount(() => {
		const timer = setTimeout(() => onfinish?.(), DURATION_MS);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="day-complete-celebration pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
	role="status"
	aria-live="polite"
>
	<div class="day-complete-confetti" aria-hidden="true">
		{#each particles as particle (particle.id)}
			<span
				class="day-complete-particle day-complete-particle--{particle.shape}"
				style="
					--left: {particle.left};
					--delay: {particle.delay};
					--duration: {particle.duration};
					--drift: {particle.drift};
					--color: {particle.color};
					--size: {particle.size}px;
					--spin: {particle.spin};
				"
			></span>
		{/each}
	</div>

	<div class="day-complete-stamp rounded-xl border-[5px] border-green bg-surface-1/80 px-6 py-3 text-3xl font-black tracking-wide text-green uppercase">
		All done!
	</div>
</div>

<style>
	.day-complete-stamp {
		transform: rotate(-8deg);
		animation: day-complete-stamp-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
		box-shadow: 0 12px 40px color-mix(in srgb, var(--ctp-green) 25%, transparent);
	}

	.day-complete-confetti {
		position: absolute;
		inset: 0;
	}

	.day-complete-particle {
		position: absolute;
		top: -8%;
		left: var(--left);
		width: var(--size);
		height: var(--size);
		background: var(--color);
		opacity: 0;
		animation: day-complete-fall var(--duration) cubic-bezier(0.25, 0.75, 0.35, 1) var(--delay) both;
	}

	.day-complete-particle--0 {
		border-radius: 9999px;
	}

	.day-complete-particle--1 {
		border-radius: 2px;
	}

	.day-complete-particle--2 {
		width: calc(var(--size) * 0.55);
		height: calc(var(--size) * 1.35);
		border-radius: 1px;
	}

	@keyframes day-complete-stamp-in {
		0% {
			opacity: 0;
			transform: rotate(-8deg) scale(1.7);
		}

		65% {
			opacity: 1;
			transform: rotate(-8deg) scale(0.94);
		}

		100% {
			opacity: 1;
			transform: rotate(-8deg) scale(1);
		}
	}

	@keyframes day-complete-fall {
		0% {
			opacity: 0;
			transform: translate3d(0, 0, 0) rotate(0deg) scale(0.6);
		}

		12% {
			opacity: 1;
		}

		100% {
			opacity: 0;
			transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin)) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.day-complete-stamp {
			animation: none;
			opacity: 1;
		}

		.day-complete-particle {
			display: none;
		}
	}
</style>
