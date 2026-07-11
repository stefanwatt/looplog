export type RealtimeConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'subscribed'
	| 'closed'
	| 'error'
	| 'timed_out';

export type RealtimeDiagnosticEvent = {
	id: number;
	at: Date;
	kind: 'lifecycle' | 'heartbeat' | 'postgres' | 'auth';
	message: string;
};

export type JwtClaimsSummary = {
	sub: string | null;
	role: string | null;
	expiresAt: Date | null;
};

export type RealtimeAuthDiagnostics = {
	checkedAt: Date;
	layoutUserId: string | null;
	sessionUserId: string | null;
	validatedUserId: string | null;
	subscriptionUserId: string | null;
	channelName: string | null;
	hasSession: boolean;
	hasAccessToken: boolean;
	sessionClaims: JwtClaimsSummary | null;
	realtimeClaims: JwtClaimsSummary | null;
	sessionError: string | null;
	validationError: string | null;
};

class RealtimeStatusStore {
	status = $state<RealtimeConnectionStatus>('idle');
	lastChangedAt = $state<Date | null>(null);
	lastEvent = $state<string | null>(null);
	lastPayloadAt = $state<Date | null>(null);
	payloadCount = $state(0);
	lastPayloadSummary = $state<string | null>(null);
	heartbeatStatus = $state<string | null>(null);
	lastHeartbeatAt = $state<Date | null>(null);
	subscriptionUserId = $state<string | null>(null);
	channelName = $state<string | null>(null);
	auth = $state<RealtimeAuthDiagnostics | null>(null);
	events = $state.raw<RealtimeDiagnosticEvent[]>([]);
	private nextEventId = 1;

	get isTransportHealthy() {
		return this.status === 'subscribed' && this.heartbeatStatus === 'ok';
	}

	private addEvent(kind: RealtimeDiagnosticEvent['kind'], message: string) {
		this.events = [
			{
				id: this.nextEventId++,
				at: new Date(),
				kind,
				message
			},
			...this.events
		].slice(0, 100);
	}

	setStatus(status: RealtimeConnectionStatus, event?: string) {
		this.status = status;
		this.lastChangedAt = new Date();
		if (event) {
			this.lastEvent = event;
			this.addEvent('lifecycle', `Channel status: ${event}`);
		}
	}

	recordPayload(table: string, eventType: string) {
		this.lastPayloadAt = new Date();
		this.payloadCount += 1;
		this.lastPayloadSummary = `${table}:${eventType}`;
		this.addEvent('postgres', `Postgres ${table} ${eventType}`);
	}

	recordHeartbeat(status: string, latency?: number) {
		this.heartbeatStatus = status;
		if (status === 'ok') {
			this.lastHeartbeatAt = new Date();
		}
		const latencyText = latency == null ? '' : ` (${Math.round(latency)}ms)`;
		this.addEvent('heartbeat', `Heartbeat: ${status}${latencyText}`);
	}

	setSubscription(userId: string, channelName: string) {
		this.subscriptionUserId = userId;
		this.channelName = channelName;
		this.addEvent('lifecycle', `Subscribing channel ${channelName}`);
	}

	setAuthDiagnostics(diagnostics: RealtimeAuthDiagnostics) {
		this.auth = diagnostics;
		const parts = [
			`session=${diagnostics.sessionUserId ?? 'none'}`,
			`validated=${diagnostics.validatedUserId ?? 'none'}`,
			`subscription=${diagnostics.subscriptionUserId ?? 'none'}`,
			`sessionRole=${diagnostics.sessionClaims?.role ?? 'n/a'}`,
			`realtimeRole=${diagnostics.realtimeClaims?.role ?? 'n/a'}`
		];
		this.addEvent('auth', parts.join(' · '));
	}

	reset() {
		this.status = 'idle';
		this.lastChangedAt = null;
		this.lastEvent = null;
		this.lastPayloadAt = null;
		this.payloadCount = 0;
		this.lastPayloadSummary = null;
		this.heartbeatStatus = null;
		this.lastHeartbeatAt = null;
		this.subscriptionUserId = null;
		this.channelName = null;
		this.auth = null;
		this.events = [];
		this.nextEventId = 1;
	}
}

let store: RealtimeStatusStore | null = null;

export function getRealtimeStatusStore() {
	if (!store) {
		store = new RealtimeStatusStore();
	}
	return store;
}

export function mapRealtimeSubscribeStatus(status: string): RealtimeConnectionStatus {
	switch (status) {
		case 'SUBSCRIBED':
			return 'subscribed';
		case 'TIMED_OUT':
			return 'timed_out';
		case 'CLOSED':
			return 'closed';
		case 'CHANNEL_ERROR':
			return 'error';
		default:
			return 'connecting';
	}
}
