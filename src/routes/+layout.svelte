<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/anytime', label: 'Anytime' },
		{ href: '/next', label: 'Next' },
		{ href: '/today', label: 'Today' }
	];

	let { children } = $props();

	const showNav = $derived(!page.url.pathname.startsWith('/auth'));
</script>

<div class="app-shell">
	<main class="app-main">{@render children()}</main>

	{#if showNav}
		<nav class="bottom-nav" aria-label="Main">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="bottom-nav__item"
					class:bottom-nav__item--active={page.url.pathname === tab.href}
					aria-current={page.url.pathname === tab.href ? 'page' : undefined}
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	{/if}
</div>

<style>
	.app-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: #0b0f14;
		color: #e8edf2;
	}

	.app-main {
		flex: 1;
		padding: 1rem 1rem 5.5rem;
		max-width: 32rem;
		margin: 0 auto;
		width: 100%;
	}

	.bottom-nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: rgba(15, 20, 28, 0.96);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(12px);
		padding: 0.35rem 0 calc(0.35rem + env(safe-area-inset-bottom));
	}

	.bottom-nav__item {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #8b98a8;
		text-decoration: none;
	}

	.bottom-nav__item--active {
		color: #7dd3fc;
	}
</style>
