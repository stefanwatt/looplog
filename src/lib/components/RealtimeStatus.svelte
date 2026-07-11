<script lang="ts">
	import { getRealtimeStatusStore } from '$lib/habits/realtime-status.svelte';

	const realtime = getRealtimeStatusStore();

	const label = $derived.by(() => {
		switch (realtime.status) {
			case 'subscribed':
				return 'Live';
			case 'connecting':
				return 'Connecting';
			case 'closed':
				return 'Disconnected';
			case 'timed_out':
				return 'Timed out';
			case 'error':
				return 'Error';
			default:
				return 'Offline';
		}
	});

	const detail = $derived.by(() => {
		const parts = [label];
		if (realtime.lastEvent && realtime.lastEvent !== label) {
			parts.push(realtime.lastEvent);
		}
		if (realtime.lastChangedAt) {
			parts.push(realtime.lastChangedAt.toLocaleTimeString());
		}
		return parts.join(' · ');
	});

	const toneClass = $derived.by(() => {
		switch (realtime.status) {
			case 'subscribed':
				return 'bg-green/15 text-green border-green/30';
			case 'connecting':
				return 'bg-yellow/15 text-yellow border-yellow/30';
			case 'closed':
			case 'timed_out':
			case 'error':
				return 'bg-red/15 text-red border-red/30';
			default:
				return 'bg-surface-0/40 text-subtext-0 border-surface-0/60';
		}
	});

	const dotClass = $derived.by(() => {
		switch (realtime.status) {
			case 'subscribed':
				return 'bg-green';
			case 'connecting':
				return 'bg-yellow animate-pulse';
			case 'closed':
			case 'timed_out':
			case 'error':
				return 'bg-red';
			default:
				return 'bg-overlay-0';
		}
	});
</script>

<div
	class="pointer-events-none fixed top-[calc(0.5rem+env(safe-area-inset-top))] right-2 z-50"
	aria-live="polite"
>
	<div
		class="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase backdrop-blur-sm {toneClass}"
		title={detail}
	>
		<span class="h-1.5 w-1.5 rounded-full {dotClass}" aria-hidden="true"></span>
		<span>{label}</span>
	</div>
</div>
