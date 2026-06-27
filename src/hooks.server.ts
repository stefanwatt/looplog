import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Database } from '$lib/database.types';
import { assertSupabaseConfig } from '$lib/supabase/config';

const supabaseHandle: Handle = async ({ event, resolve }) => {
	const { url, key } = assertSupabaseConfig();

	event.locals.supabase = createServerClient<Database>(url, key, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session } = await event.locals.safeGetSession();
	const path = event.url.pathname;
	const isAuthRoute = path.startsWith('/auth');

	if (!session && !isAuthRoute) {
		redirect(303, '/auth/login');
	}

	if (session && path === '/auth/login') {
		redirect(303, '/next');
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandle, authGuard);
