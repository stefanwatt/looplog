<script lang="ts">
	import { createClient } from '$lib/supabase/client';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { mdiEmail } from '@mdi/js';

	let email = $state('');
	let message = $state('');
	let error = $state(page.url.searchParams.get('error') ?? '');
	let loading = $state(false);

	async function sendLink(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = '';
		message = '';

		const supabase = createClient();
		const redirectTo = `${window.location.origin}/auth/callback`;

		const { error: signInError } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo }
		});

		loading = false;

		if (signInError) {
			error = signInError.message;
			return;
		}

		message = 'Check your email for a magic link.';
	}
</script>

<svelte:head>
	<title>Sign in · Looplog</title>
</svelte:head>

<section class="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5 py-8">
	<div>
		<h1 class="mb-1.5 text-3xl font-bold">Looplog</h1>
		<p class="m-0 text-subtext-0">Habit tracking focused on adherence, not just progress.</p>
	</div>

	<form class="grid gap-3" onsubmit={sendLink}>
		<label for="email" class="text-sm text-subtext-1">Email</label>
		<div class="relative">
			<span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtext-0">
				<Icon path={mdiEmail} size={20} />
			</span>
			<input
				id="email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				placeholder="you@example.com"
				class="w-full rounded-xl border border-surface-0 bg-surface-0/30 py-3.5 pr-4 pl-11 text-text"
			/>
		</div>
		<button
			type="submit"
			disabled={loading}
			class="rounded-xl border-0 bg-blue py-3.5 font-semibold text-crust disabled:opacity-60"
		>
			{loading ? 'Sending…' : 'Send magic link'}
		</button>
	</form>

	{#if message}
		<p class="m-0 text-green">{message}</p>
	{/if}
	{#if error}
		<p class="m-0 text-red">{error}</p>
	{/if}
</section>
