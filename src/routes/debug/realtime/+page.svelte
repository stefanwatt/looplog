<script lang="ts">
	import { getRealtimeStatusStore } from '$lib/habits/realtime-status.svelte';
	import { SvelteDate } from 'svelte/reactivity';

	const realtime = getRealtimeStatusStore();
	const heartbeatFreshnessMs = 45_000;
	const now = new SvelteDate();

	$effect(() => {
		const interval = window.setInterval(() => {
			now.setTime(Date.now());
		}, 1_000);

		return () => window.clearInterval(interval);
	});

	const heartbeatAgeMs = $derived(
		realtime.lastHeartbeatAt ? Math.max(0, now.getTime() - realtime.lastHeartbeatAt.getTime()) : null
	);
	const heartbeatIsRecent = $derived(
		heartbeatAgeMs !== null && heartbeatAgeMs <= heartbeatFreshnessMs
	);
	const shouldReceiveEvents = $derived(
		realtime.status === 'subscribed' && realtime.heartbeatStatus === 'ok' && heartbeatIsRecent
	);
	const transportLabel = $derived(
		shouldReceiveEvents ? 'Events should arrive' : 'Events are not expected to arrive'
	);
	const transportTone = $derived(
		shouldReceiveEvents
			? 'border-green/30 bg-green/10 text-green'
			: 'border-red/30 bg-red/10 text-red'
	);
	const subscriptionTone = $derived(
		realtime.status === 'subscribed'
			? 'text-green'
			: realtime.status === 'connecting'
				? 'text-yellow'
				: 'text-red'
	);
	const heartbeatTone = $derived(
		realtime.heartbeatStatus === 'ok' && heartbeatIsRecent ? 'text-green' : 'text-red'
	);

	function formatTime(value: Date | null) {
		return value ? value.toLocaleTimeString() : 'Never';
	}

	function formatAge(value: number | null) {
		if (value === null) return 'No successful heartbeat yet';
		if (value < 1_000) return 'Just now';
		return `${Math.floor(value / 1_000)}s ago`;
	}

	function eventTone(kind: (typeof realtime.events)[number]['kind']) {
		switch (kind) {
			case 'postgres':
				return 'border-blue/30 bg-blue/10 text-blue';
			case 'heartbeat':
				return 'border-green/30 bg-green/10 text-green';
			default:
				return 'border-surface-0 bg-surface-0/50 text-subtext-0';
		}
	}
</script>

<svelte:head>
	<title>Realtime debug</title>
</svelte:head>

<section class="space-y-4">
	<header class="space-y-1">
		<p class="text-xs font-semibold tracking-widest text-subtext-0 uppercase">Debug</p>
		<h1 class="text-2xl font-bold">Realtime health</h1>
		<p class="text-sm text-subtext-0">
			This view reports the current browser channel only. It does not prove that a database write will
			match your subscription filter.
		</p>
	</header>

	<div class="rounded-xl border p-4 {transportTone}" aria-live="polite">
		<p class="text-sm font-semibold">{transportLabel}</p>
		{#if shouldReceiveEvents}
			<p class="mt-1 text-sm text-subtext-0">
				The channel is subscribed and its most recent heartbeat succeeded.
			</p>
		{:else}
			<p class="mt-1 text-sm text-subtext-0">
				Subscription and heartbeat must both be healthy before Postgres changes can be expected.
			</p>
		{/if}
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<article class="rounded-xl border border-surface-0 bg-mantle p-4">
			<p class="text-xs font-semibold tracking-wider text-subtext-0 uppercase">Subscription</p>
			<p class="mt-2 text-lg font-semibold {subscriptionTone}">{realtime.status}</p>
			<p class="mt-1 text-sm text-subtext-0">
				Last lifecycle event: {realtime.lastEvent ?? 'None'} · {formatTime(realtime.lastChangedAt)}
			</p>
		</article>

		<article class="rounded-xl border border-surface-0 bg-mantle p-4">
			<p class="text-xs font-semibold tracking-wider text-subtext-0 uppercase">Heartbeat</p>
			<p class="mt-2 text-lg font-semibold {heartbeatTone}">
				{realtime.heartbeatStatus ?? 'Not received'}
			</p>
			<p class="mt-1 text-sm text-subtext-0">
				Last successful heartbeat: {formatAge(heartbeatAgeMs)} ·
				{formatTime(realtime.lastHeartbeatAt)}
			</p>
		</article>
	</div>

	<section class="rounded-xl border border-surface-0 bg-mantle">
		<div class="flex items-center justify-between border-b border-surface-0 px-4 py-3">
			<div>
				<h2 class="font-semibold">Realtime event console</h2>
				<p class="text-sm text-subtext-0">
					Lifecycle, heartbeat, and Postgres change events in reverse chronological order.
				</p>
			</div>
			<span class="rounded-full bg-surface-0 px-2 py-0.5 text-xs text-subtext-0">
				{realtime.events.length}
			</span>
		</div>

		{#if realtime.events.length}
			<ol class="max-h-96 divide-y divide-surface-0 overflow-y-auto" aria-label="Realtime events">
				{#each realtime.events as event (event.id)}
					<li class="flex gap-3 px-4 py-3">
						<time class="shrink-0 font-mono text-xs text-subtext-0" datetime={event.at.toISOString()}>
							{event.at.toLocaleTimeString()}
						</time>
						<span
							class="h-fit rounded border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase {eventTone(
								event.kind
							)}"
						>
							{event.kind}
						</span>
						<p class="min-w-0 text-sm break-words">{event.message}</p>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="px-4 py-8 text-center text-sm text-subtext-0">
				No Realtime lifecycle or Postgres events have been recorded in this session.
			</p>
		{/if}
	</section>
</section>
