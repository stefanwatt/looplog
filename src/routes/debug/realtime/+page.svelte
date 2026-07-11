<script lang="ts">
	import { refreshRealtimeAuthDiagnostics } from '$lib/habits/realtime-auth-diagnostics';
	import { getRealtimeStatusStore } from '$lib/habits/realtime-status.svelte';
	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props();

	const realtime = getRealtimeStatusStore();
	const heartbeatFreshnessMs = 45_000;
	const now = new SvelteDate();
	let authRefreshing = $state(false);

	$effect(() => {
		const interval = window.setInterval(() => {
			now.setTime(Date.now());
		}, 1_000);

		return () => window.clearInterval(interval);
	});

	$effect(() => {
		void refreshAuth();
		const interval = window.setInterval(() => {
			void refreshAuth();
		}, 5_000);

		return () => window.clearInterval(interval);
	});

	async function refreshAuth() {
		authRefreshing = true;
		try {
			await refreshRealtimeAuthDiagnostics(data.user?.id ?? null);
		} finally {
			authRefreshing = false;
		}
	}

	const auth = $derived(realtime.auth);
	const heartbeatAgeMs = $derived(
		realtime.lastHeartbeatAt ? Math.max(0, now.getTime() - realtime.lastHeartbeatAt.getTime()) : null
	);
	const heartbeatIsRecent = $derived(
		heartbeatAgeMs !== null && heartbeatAgeMs <= heartbeatFreshnessMs
	);
	const idsAligned = $derived.by(() => {
		if (!auth) return false;
		return Boolean(
			auth.layoutUserId &&
				auth.sessionUserId &&
				auth.validatedUserId &&
				auth.subscriptionUserId &&
				auth.layoutUserId === auth.sessionUserId &&
				auth.sessionUserId === auth.validatedUserId &&
				auth.sessionUserId === auth.subscriptionUserId
		);
	});
	const realtimeUsesUserJwt = $derived(auth?.realtimeClaims?.role === 'authenticated');
	const shouldReceiveEvents = $derived(
		realtime.status === 'subscribed' &&
			realtime.heartbeatStatus === 'ok' &&
			heartbeatIsRecent &&
			idsAligned &&
			realtimeUsesUserJwt
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

	function boolLabel(value: boolean | null | undefined) {
		if (value == null) return 'Unknown';
		return value ? 'Yes' : 'No';
	}

	function eventTone(kind: (typeof realtime.events)[number]['kind']) {
		switch (kind) {
			case 'postgres':
				return 'border-blue/30 bg-blue/10 text-blue';
			case 'heartbeat':
				return 'border-green/30 bg-green/10 text-green';
			case 'auth':
				return 'border-mauve/30 bg-mauve/10 text-mauve';
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
			Transport health plus auth identity checks. Postgres events should appear in the console when
			subscription, heartbeat, user ids, and Realtime JWT role all line up.
		</p>
	</header>

	<div class="rounded-xl border p-4 {transportTone}" aria-live="polite">
		<p class="text-sm font-semibold">{transportLabel}</p>
		{#if shouldReceiveEvents}
			<p class="mt-1 text-sm text-subtext-0">
				Channel subscribed, heartbeat fresh, ids aligned, and Realtime is using an authenticated JWT.
			</p>
		{:else}
			<p class="mt-1 text-sm text-subtext-0">
				One or more prerequisites failed. Check auth identity and JWT role below.
			</p>
		{/if}
	</div>

	<section class="rounded-xl border border-surface-0 bg-mantle p-4">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="font-semibold">Auth identity</h2>
				<p class="text-sm text-subtext-0">
					Layout user, browser session, server-validated user, and subscription filter must match.
				</p>
			</div>
			<button
				type="button"
				class="shrink-0 rounded-lg border border-surface-0 px-3 py-1.5 text-sm font-semibold text-blue"
				disabled={authRefreshing}
				onclick={() => refreshAuth()}
			>
				{authRefreshing ? 'Checking…' : 'Refresh'}
			</button>
		</div>

		{#if auth}
			<dl class="mt-4 grid gap-3 text-sm">
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Layout user</dt>
					<dd class="font-mono break-all">{auth.layoutUserId ?? 'None'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Session user</dt>
					<dd class="font-mono break-all">{auth.sessionUserId ?? 'None'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Validated user</dt>
					<dd class="font-mono break-all">{auth.validatedUserId ?? 'None'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Subscription user</dt>
					<dd class="font-mono break-all">{auth.subscriptionUserId ?? 'None'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Channel</dt>
					<dd class="font-mono break-all">{auth.channelName ?? 'Not started'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Has session</dt>
					<dd>{boolLabel(auth.hasSession)}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Has access token</dt>
					<dd>{boolLabel(auth.hasAccessToken)}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Ids aligned</dt>
					<dd class={idsAligned ? 'text-green' : 'text-red'}>{boolLabel(idsAligned)}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Session JWT role</dt>
					<dd class="font-mono">{auth.sessionClaims?.role ?? 'n/a'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Realtime JWT role</dt>
					<dd class="font-mono {realtimeUsesUserJwt ? 'text-green' : 'text-red'}">
						{auth.realtimeClaims?.role ?? 'n/a'}
					</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Session JWT sub</dt>
					<dd class="font-mono break-all">{auth.sessionClaims?.sub ?? 'n/a'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Realtime JWT sub</dt>
					<dd class="font-mono break-all">{auth.realtimeClaims?.sub ?? 'n/a'}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Token expires</dt>
					<dd>{formatTime(auth.sessionClaims?.expiresAt ?? null)}</dd>
				</div>
				<div class="grid grid-cols-[9rem_1fr] gap-2">
					<dt class="text-subtext-0">Checked at</dt>
					<dd>{formatTime(auth.checkedAt)}</dd>
				</div>
			</dl>

			{#if auth.sessionError || auth.validationError}
				<div class="mt-4 rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
					{#if auth.sessionError}
						<p>Session error: {auth.sessionError}</p>
					{/if}
					{#if auth.validationError}
						<p>Validation error: {auth.validationError}</p>
					{/if}
				</div>
			{/if}
		{:else}
			<p class="mt-4 text-sm text-subtext-0">Auth diagnostics not loaded yet.</p>
		{/if}
	</section>

	<div class="grid gap-3 sm:grid-cols-2">
		<article class="rounded-xl border border-surface-0 bg-mantle p-4">
			<p class="text-xs font-semibold tracking-wider text-subtext-0 uppercase">Subscription</p>
			<p class="mt-2 text-lg font-semibold {subscriptionTone}">{realtime.status}</p>
			<p class="mt-1 text-sm text-subtext-0">
				Last lifecycle event: {realtime.lastEvent ?? 'None'} · {formatTime(realtime.lastChangedAt)}
			</p>
			<p class="mt-1 text-sm text-subtext-0">
				Postgres events received: {realtime.payloadCount}
				{#if realtime.lastPayloadSummary}
					· last {realtime.lastPayloadSummary}
				{/if}
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
					Lifecycle, auth, heartbeat, and Postgres change events in reverse chronological order.
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
