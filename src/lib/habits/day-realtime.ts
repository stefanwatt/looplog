import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Habit, HabitLog } from '$lib/database.types';
import { getDayStore } from '$lib/habits/day.svelte';
import {
	getRealtimeStatusStore,
	mapRealtimeSubscribeStatus
} from '$lib/habits/realtime-status.svelte';
import { createClient } from '$lib/supabase/client';

let channel: RealtimeChannel | null = null;

function clearChannelIfClosed(status: string) {
	if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
		channel = null;
	}
}

export function startDayRealtime(userId: string) {
	if (channel) return;

	const supabase = createClient();
	const store = getDayStore();
	const realtimeStatus = getRealtimeStatusStore();

	const channelName = `day:${userId}`;

	realtimeStatus.setSubscription(userId, channelName);
	realtimeStatus.setStatus('connecting', 'SUBSCRIBING');
	supabase.realtime.onHeartbeat((status, latency) => {
		realtimeStatus.recordHeartbeat(status, latency);
	});

	channel = supabase
		.channel(channelName)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'habit_logs',
				filter: `user_id=eq.${userId}`
			},
			(payload) => {
				realtimeStatus.recordPayload('habit_logs', payload.eventType);

				if (payload.eventType === 'DELETE') {
					const old = payload.old as { habit_id?: string; log_date?: string };
					if (old.habit_id && old.log_date) {
						store.removeLog(old.habit_id, old.log_date);
					}
					return;
				}

				store.applyLog(payload.new as HabitLog);
			}
		)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'habits',
				filter: `user_id=eq.${userId}`
			},
			(payload) => {
				realtimeStatus.recordPayload('habits', payload.eventType);

				if (payload.eventType === 'DELETE') {
					const old = payload.old as { id?: string };
					if (old.id) {
						store.removeHabit(old.id);
					}
					return;
				}

				store.applyHabit(payload.new as Habit);
			}
		)
		.subscribe((status) => {
			realtimeStatus.setStatus(mapRealtimeSubscribeStatus(status), status);
			clearChannelIfClosed(status);
		});
}

export function restartDayRealtime(userId: string) {
	stopDayRealtime();
	startDayRealtime(userId);
}

export function stopDayRealtime() {
	const realtimeStatus = getRealtimeStatusStore();

	if (!channel) {
		realtimeStatus.reset();
		return;
	}

	const supabase = createClient();
	supabase.removeChannel(channel);
	channel = null;
	realtimeStatus.reset();
}
