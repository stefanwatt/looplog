<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import {
		dismissInstallPrompt,
		isAndroid,
		isInAppBrowser,
		isStandalone,
		wasInstallDismissed,
		type BeforeInstallPromptEvent
	} from '$lib/pwa/install';
	import { mdiClose, mdiDownload } from '@mdi/js';

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let dismissed = $state(wasInstallDismissed());
	let showManualHelp = $state(false);

	const visible = $derived(
		browser && !isStandalone() && !dismissed && (deferredPrompt !== null || showManualHelp)
	);

	const bottomClass = $derived(
		page.url.pathname.startsWith('/auth')
			? 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'
			: 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'
	);

	$effect(() => {
		if (!browser || isStandalone() || dismissed) return;

		const onBeforeInstall = (event: Event) => {
			event.preventDefault();
			deferredPrompt = event as BeforeInstallPromptEvent;
			showManualHelp = false;
		};

		window.addEventListener('beforeinstallprompt', onBeforeInstall);

		const timer = window.setTimeout(() => {
			if (!deferredPrompt && isAndroid()) {
				showManualHelp = true;
			}
		}, 4_000);

		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
			window.clearTimeout(timer);
		};
	});

	async function install() {
		if (!deferredPrompt) return;

		await deferredPrompt.prompt();
		await deferredPrompt.userChoice;
		deferredPrompt = null;
		close();
	}

	function close() {
		dismissed = true;
		dismissInstallPrompt();
		deferredPrompt = null;
		showManualHelp = false;
	}
</script>

{#if visible}
	<aside
		class="fixed right-4 left-4 z-50 mx-auto max-w-lg rounded-2xl border border-surface-0/60 bg-mantle p-4 shadow-lg {bottomClass}"
		aria-label="Install Looplog"
	>
		<div class="flex items-start gap-3">
			<span class="mt-0.5 shrink-0 text-blue">
				<Icon path={mdiDownload} size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="m-0 font-semibold text-text">Install Looplog</p>
				{#if deferredPrompt}
					<p class="mt-1 mb-3 text-sm text-subtext-0">
						Add Looplog to your home screen for quick access.
					</p>
					<button
						type="button"
						class="rounded-xl border-0 bg-blue px-4 py-2.5 text-sm font-semibold text-white"
						onclick={install}
					>
						Install
					</button>
				{:else if isInAppBrowser()}
					<p class="mt-1 mb-0 text-sm text-subtext-0">
						Opened from email? Tap the browser menu, choose <strong>Open in Chrome</strong>, then
						try again. In-app browsers cannot install apps.
					</p>
				{:else}
					<p class="mt-1 mb-0 text-sm text-subtext-0">
						In Chrome: tap <strong>⋮</strong> → <strong>Install app</strong> (or
						<strong>Add to Home screen</strong>). Use the site for a moment first if the option is
						missing.
					</p>
				{/if}
			</div>
			<button
				type="button"
				class="shrink-0 rounded-lg border-0 bg-transparent p-1 text-subtext-0"
				aria-label="Dismiss"
				onclick={close}
			>
				<Icon path={mdiClose} size={20} />
			</button>
		</div>
	</aside>
{/if}
