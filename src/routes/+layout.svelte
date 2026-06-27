<script lang="ts">
	import './layout.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import CreateHabitButton from '$lib/components/CreateHabitButton.svelte';
	import DayTab from '$lib/components/tabs/DayTab.svelte';
	import FocusTab from '$lib/components/tabs/FocusTab.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { startDayRealtime, stopDayRealtime } from '$lib/habits/day-realtime';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { mdiCalendarToday, mdiPlayCircle } from '@mdi/js';

	const tabs = [
		{ href: '/focus', label: 'Focus', icon: mdiPlayCircle },
		{ href: '/day', label: 'Day', icon: mdiCalendarToday }
	] as const;

	const tabPaths = new Set<string>(tabs.map((tab) => tab.href));

	let { children, data } = $props();

	const showNav = $derived(!page.url.pathname.startsWith('/auth'));
	const isTabRoute = $derived(tabPaths.has(page.url.pathname));
	const day = getDayStore();

	if (data.user && data.day) {
		if (!day.ready) {
			day.init(data.user.id, data.day);
		}
	} else if (day.ready) {
		day.reset();
	}

	$effect(() => {
		if (!browser) return;

		if (!data.user) {
			stopDayRealtime();
			return;
		}

		startDayRealtime(data.user.id);
	});

	function navigateTab(href: (typeof tabs)[number]['href'], event: MouseEvent) {
		if (
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey ||
			event.button !== 0
		) {
			return;
		}

		event.preventDefault();

		if (page.url.pathname === href && page.url.search === '') return;

		void goto(href, { invalidateAll: false, keepFocus: true, noScroll: true });
	}
</script>

<div class="flex min-h-dvh flex-col bg-base font-sans text-text">
	<main class="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-[5.5rem]">
		{#if isTabRoute}
			<div class:hidden={page.url.pathname !== '/focus'}>
				<FocusTab />
			</div>
			<div class:hidden={page.url.pathname !== '/day'}>
				<DayTab />
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>

	{#if showNav}
		<nav
			class="fixed right-0 bottom-0 left-0 flex items-center gap-2 border-t border-surface-0/50 bg-mantle/95 px-3 pt-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur-md"
			aria-label="Main"
		>
			<div class="grid min-w-0 flex-1 grid-cols-2">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						onclick={(event) => navigateTab(tab.href, event)}
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
			</div>
			<CreateHabitButton />
		</nav>
	{/if}
</div>
