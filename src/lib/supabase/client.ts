import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '$lib/database.types';
import { assertSupabaseConfig } from '$lib/supabase/config';

export function createClient() {
	const { url, key } = assertSupabaseConfig();
	return createBrowserClient<Database>(url, key);
}
