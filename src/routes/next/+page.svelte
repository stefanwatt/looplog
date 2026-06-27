<script lang="ts">
	import NextStackEmptyState from '$lib/components/NextStackEmptyState.svelte';
	import NextStack from './NextStack.svelte';

	let { data } = $props();

	let undoAvailable = $state(false);
	let doneCount = $state(data.doneCount);
	let stackEmpty = $state(data.upcomingHabits.length === 0);
</script>

<svelte:head>
	<title>Next · Looplog</title>
</svelte:head>

<section class="flex h-[calc(100dvh-5.5rem-1rem)] flex-col overflow-hidden">
	<header class="shrink-0">
		<h1 class="m-0 text-2xl font-bold">Next</h1>
		<p class="mt-1 mb-3 text-subtext-0">
			{doneCount} / {data.timedCount} timed habits done
		</p>
	</header>

	{#key data.dateKey}
		<NextStack
			upcomingHabits={data.upcomingHabits}
			timezone={data.timezone}
			canSkip={data.canSkip}
			initialDoneCount={data.doneCount}
			dateKey={data.dateKey}
			bind:doneCount
			bind:undoAvailable
			bind:stackEmpty
		/>
	{/key}

	{#if stackEmpty && data.upcomingHabits.length === 0}
		{#if data.timedCount === 0}
			<NextStackEmptyState message="No timed habits for today.">
				{#snippet actions()}
					<a href="/habits/new" class="mt-3 text-blue">Create a habit</a>
				{/snippet}
			</NextStackEmptyState>
		{:else}
			<NextStackEmptyState message="Nothing to log right now." />
		{/if}
	{/if}
</section>
