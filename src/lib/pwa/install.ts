import { browser } from '$app/environment';

const DISMISS_KEY = 'looplog-install-dismissed';

export type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function isStandalone() {
	return (
		browser &&
		(window.matchMedia('(display-mode: standalone)').matches ||
			// iOS legacy
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true)
	);
}

export function isAndroid() {
	return browser && /Android/i.test(navigator.userAgent);
}

export function isInAppBrowser() {
	if (!browser) return false;

	const ua = navigator.userAgent;
	return /wv\)|FBAN|FBAV|Instagram|Line\//i.test(ua);
}

export function wasInstallDismissed() {
	if (!browser) return false;
	return localStorage.getItem(DISMISS_KEY) === '1';
}

export function dismissInstallPrompt() {
	if (!browser) return;
	localStorage.setItem(DISMISS_KEY, '1');
}
