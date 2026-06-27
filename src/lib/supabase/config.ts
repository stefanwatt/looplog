import { env as publicEnv } from '$env/dynamic/public';

export function getSupabaseUrl() {
	return publicEnv.PUBLIC_SUPABASE_URL ?? '';
}

export function getSupabaseKey() {
	return publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function assertSupabaseConfig() {
	const url = getSupabaseUrl();
	const key = getSupabaseKey();

	if (!url || !key) {
		throw new Error(
			'Missing Supabase env vars. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env'
		);
	}

	return { url, key };
}
