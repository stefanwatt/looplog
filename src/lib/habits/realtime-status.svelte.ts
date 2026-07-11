export type RealtimeConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'subscribed'
	| 'closed'
	| 'error'
	| 'timed_out';

class RealtimeStatusStore {
	status = $state<RealtimeConnectionStatus>('idle');
	lastChangedAt = $state<Date | null>(null);
	lastEvent = $state<string | null>(null);

	setStatus(status: RealtimeConnectionStatus, event?: string) {
		this.status = status;
		this.lastChangedAt = new Date();
		if (event) {
			this.lastEvent = event;
		}
	}

	reset() {
		this.status = 'idle';
		this.lastChangedAt = null;
		this.lastEvent = null;
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
