<script lang="ts">
	import { createClient } from '$lib/supabase/client';
	import { page } from '$app/state';

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

<section class="login">
	<div class="login__brand">
		<h1>Looplog</h1>
		<p>Habit tracking focused on adherence, not just progress.</p>
	</div>

	<form class="login__form" onsubmit={sendLink}>
		<label for="email">Email</label>
		<input
			id="email"
			type="email"
			autocomplete="email"
			required
			bind:value={email}
			placeholder="you@example.com"
		/>
		<button type="submit" disabled={loading}>
			{loading ? 'Sending…' : 'Send magic link'}
		</button>
	</form>

	{#if message}
		<p class="login__message">{message}</p>
	{/if}
	{#if error}
		<p class="login__error">{error}</p>
	{/if}
</section>

<style>
	.login {
		min-height: 100dvh;
		display: grid;
		align-content: center;
		gap: 1.5rem;
		padding: 2rem 1.25rem;
		max-width: 24rem;
		margin: 0 auto;
	}

	.login__brand h1 {
		margin: 0 0 0.35rem;
		font-size: 2rem;
	}

	.login__brand p {
		margin: 0;
		color: #8b98a8;
	}

	.login__form {
		display: grid;
		gap: 0.75rem;
	}

	label {
		font-size: 0.85rem;
		color: #b8c2cf;
	}

	input {
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #121821;
		color: inherit;
		padding: 0.85rem 1rem;
	}

	button {
		border: 0;
		border-radius: 0.75rem;
		background: #0284c7;
		color: white;
		font-weight: 600;
		padding: 0.85rem 1rem;
	}

	button:disabled {
		opacity: 0.6;
	}

	.login__message {
		color: #86efac;
		margin: 0;
	}

	.login__error {
		color: #fca5a5;
		margin: 0;
	}
</style>
