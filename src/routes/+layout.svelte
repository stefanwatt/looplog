<script lang="ts">
	import './layout.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import CreateHabitButton from '$lib/components/CreateHabitButton.svelte';
	import InstallApp from '$lib/components/InstallApp.svelte';
	import DayTab from '$lib/components/tabs/DayTab.svelte';
	import FocusTab from '$lib/components/tabs/FocusTab.svelte';
	import StatsTab from '$lib/components/tabs/StatsTab.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { startAppResumeSync } from '$lib/habits/app-resume';
	import { startDayRealtime, stopDayRealtime } from '$lib/habits/day-realtime';
	import { getDayStore } from '$lib/habits/day.svelte';
	import { getStatsStore } from '$lib/habits/stats.svelte';
	import { onNavigate } from '$app/navigation';
	import { mdiBug, mdiCalendarToday, mdiChartLine, mdiPlayCircle } from '@mdi/js';

	const tabs = [
		{ href: '/focus', label: 'Focus', icon: mdiPlayCircle },
		{ href: '/day', label: 'Day', icon: mdiCalendarToday },
		{ href: '/stats', label: 'Stats', icon: mdiChartLine }
	] as const;

	const tabPaths = new Set<string>(tabs.map((tab) => tab.href));

	let { children, data } = $props();

	const showNav = $derived(!page.url.pathname.startsWith('/auth'));
	const isTabRoute = $derived(tabPaths.has(page.url.pathname));
	const day = getDayStore();
	const stats = getStatsStore();

	if (data.user && data.day) {
		if (!day.ready) {
			day.init(data.user.id, data.day);
		} else if (data.day.dateKey !== day.todayDateKey) {
			void day.refreshOnResume();
		}
	} else if (day.ready) {
		day.reset();
		stats.reset();
	}

	$effect(() => {
		const userId = data.user?.id;
		if (!userId || !page.url.pathname.startsWith('/stats')) return;
		void stats.load(userId);
	});

	$effect(() => {
		if (!browser) return;

		if (!data.user) {
			stopDayRealtime();
			return;
		}

		void startDayRealtime(data.user.id);
	});

	$effect(() => {
		if (!browser || !data.user) return;

		const userId = data.user.id;

		return startAppResumeSync(() => ({
			userId,
			reloadStats: page.url.pathname.startsWith('/stats')
		}));
	});

	onNavigate((navigation) => {
		if (!browser || !document.startViewTransition) return;

		const fromStats = navigation.from?.url.pathname.startsWith('/stats') ?? false;
		const toStats = navigation.to?.url.pathname.startsWith('/stats') ?? false;
		if (!fromStats && !toStats) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	function navigateTab(href: string, event: MouseEvent) {
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

<div class="flex h-dvh flex-col overflow-hidden bg-base font-sans text-text">
	<main
		class="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-[5.5rem]"
	>
		{#if isTabRoute}
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
				class:hidden={page.url.pathname !== '/focus'}
			>
				<FocusTab />
			</div>
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
				class:hidden={page.url.pathname !== '/day'}
			>
				<DayTab />
			</div>
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
				class:hidden={page.url.pathname !== '/stats'}
			>
				<StatsTab />
			</div>
		{:else}
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
				{@render children()}
			</div>
		{/if}
	</main>

	<InstallApp />

	{#if showNav}
		<nav
			class="fixed right-0 bottom-0 left-0 flex items-center gap-2 border-t border-surface-0/50 bg-mantle/95 px-3 pt-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur-md"
			aria-label="Main"
		>
			<div class="grid min-w-0 flex-1 grid-cols-4">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						onclick={(event) => navigateTab(tab.href, event)}
						class="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-sm font-semibold no-underline {page.url.pathname.startsWith(
							tab.href
						)
							? 'text-blue'
							: 'text-subtext-0'}"
						aria-current={page.url.pathname.startsWith(tab.href) ? 'page' : undefined}
					>
						<Icon path={tab.icon} size={20} />
						{tab.label}
					</a>
				{/each}
				{#if data.user}
					<a
						href="/debug/realtime"
						onclick={(event) => navigateTab('/debug/realtime', event)}
						class="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-sm font-semibold no-underline {page.url.pathname.startsWith(
							'/debug/realtime'
						)
							? 'text-blue'
							: 'text-subtext-0'}"
						aria-current={page.url.pathname.startsWith('/debug/realtime') ? 'page' : undefined}
					>
						<Icon path={mdiBug} size={20} />
						Debug
					</a>
				{/if}
			</div>
			<CreateHabitButton />
		</nav>
	{/if}
</div>
