<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HabitCardStack from '$lib/components/HabitCardStack.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { upsertLog } from '$lib/habits/service';
	import { createClient } from '$lib/supabase/client';
	import { mdiPlus } from '@mdi/js';

	let { data } = $props();

	let busy = $state(false);
	let error = $state('');

	async function handleLog(payload: Record<string, unknown>) {
		if (!data.nextHabit || busy) return;
		busy = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, data.nextHabit, data.dateKey, {
				status: 'logged',
				actualValue: payload.actualValue as number | undefined,
				actualTime: payload.actualTime as string | undefined,
				satisfaction: payload.satisfaction as number | undefined
			});

			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save log';
		} finally {
			busy = false;
		}
	}

	async function handleSkip() {
		if (!data.nextHabit || busy) return;
		busy = true;
		error = '';

		try {
			const supabase = createClient();
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not signed in');

			await upsertLog(supabase, user.id, data.nextHabit, data.dateKey, { status: 'skipped' });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not skip habit';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Next · Looplog</title>
</svelte:head>

<section>
	<header>
		<h1 class="m-0 text-2xl font-bold">Next</h1>
		<p class="mt-1 mb-4 text-subtext-0">
			{data.doneCount} / {data.timedCount} timed habits done
		</p>
	</header>

	{#if data.upcomingHabits.length > 0}
		{#key data.upcomingHabits[0].id}
			<HabitCardStack
				habits={data.upcomingHabits}
				timezone={data.timezone}
				canSkip={data.canSkip}
				{busy}
				onlog={handleLog}
				onskip={handleSkip}
			/>
		{/key}
	{:else if data.timedCount === 0}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">No timed habits for today.</p>
			<a href="/habits/new" class="text-blue">Create a habit</a>
		</div>
	{:else}
		<div class="rounded-2xl bg-surface-0/40 px-4 py-8 text-center">
			<p class="m-0">All timed habits are done for today.</p>
			<a href="/anytime" class="text-blue">Check anytime habits</a>
		</div>
	{/if}

	{#if error}
		<p class="mt-4 text-red">{error}</p>
	{/if}

	<a
		class="fixed right-4 bottom-[5.5rem] grid size-[3.25rem] place-items-center rounded-full bg-blue no-underline shadow-lg shadow-blue/35"
		href="/habits/new"
		aria-label="Create habit"
	>
		<Icon class="text-white" path={mdiPlus} size={28} />
	</a>
</section>
