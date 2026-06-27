<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { mdiCalendarClock, mdiCalendarToday, mdiPlayCircle } from '@mdi/js';

	const tabs = [
		{ href: '/anytime', label: 'Anytime', icon: mdiCalendarClock },
		{ href: '/next', label: 'Next', icon: mdiPlayCircle },
		{ href: '/today', label: 'Today', icon: mdiCalendarToday }
	];

	let { children } = $props();

	const showNav = $derived(!page.url.pathname.startsWith('/auth'));
</script>

<div class="flex min-h-dvh flex-col bg-base font-sans text-text">
	<main class="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-[5.5rem]">{@render children()}</main>

	{#if showNav}
		<nav
			class="fixed right-0 bottom-0 left-0 grid grid-cols-3 border-t border-surface-0/50 bg-mantle/95 pt-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur-md"
			aria-label="Main"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-sm font-semibold no-underline {page.url.pathname ===
					tab.href
						? 'text-blue'
						: 'text-subtext-0'}"
					aria-current={page.url.pathname === tab.href ? 'page' : undefined}
				>
					<Icon path={tab.icon} size={20} />
					{tab.label}
				</a>
			{/each}
		</nav>
	{/if}
</div>
