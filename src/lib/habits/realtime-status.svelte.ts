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
	kind: 'lifecycle' | 'heartbeat' | 'postgres';
	message: string;
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

	reset() {
		this.status = 'idle';
		this.lastChangedAt = null;
		this.lastEvent = null;
		this.lastPayloadAt = null;
		this.payloadCount = 0;
		this.lastPayloadSummary = null;
		this.heartbeatStatus = null;
		this.lastHeartbeatAt = null;
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
