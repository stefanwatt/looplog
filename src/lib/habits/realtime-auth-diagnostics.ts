import { getRealtimeStatusStore, type JwtClaimsSummary } from '$lib/habits/realtime-status.svelte';
import { createClient } from '$lib/supabase/client';

function decodeJwtClaims(token: string | null | undefined): JwtClaimsSummary | null {
	if (!token) return null;

	const parts = token.split('.');
	if (parts.length < 2) return null;

	try {
		const payload = JSON.parse(
			atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
		) as { sub?: string; role?: string; exp?: number };

		return {
			sub: payload.sub ?? null,
			role: payload.role ?? null,
			expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
		};
	} catch {
		return null;
	}
}

function getRealtimeAccessToken(realtime: {
	accessTokenValue?: string | null;
}): string | null {
	return realtime.accessTokenValue ?? null;
}

export async function refreshRealtimeAuthDiagnostics(layoutUserId: string | null) {
	const supabase = createClient();
	const realtimeStatus = getRealtimeStatusStore();

	const {
		data: { session },
		error: sessionError
	} = await supabase.auth.getSession();

	let validatedUserId: string | null = null;
	let validationError: string | null = null;

	if (session) {
		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser();

		if (userError) {
			validationError = userError.message;
		} else {
			validatedUserId = user?.id ?? null;
		}
	}

	const diagnostics = {
		checkedAt: new Date(),
		layoutUserId,
		sessionUserId: session?.user?.id ?? null,
		validatedUserId,
		subscriptionUserId: realtimeStatus.subscriptionUserId,
		channelName: realtimeStatus.channelName,
		hasSession: Boolean(session),
		hasAccessToken: Boolean(session?.access_token),
		sessionClaims: decodeJwtClaims(session?.access_token),
		realtimeClaims: decodeJwtClaims(getRealtimeAccessToken(supabase.realtime)),
		sessionError: sessionError?.message ?? null,
		validationError
	};

	realtimeStatus.setAuthDiagnostics(diagnostics);
	return diagnostics;
}
