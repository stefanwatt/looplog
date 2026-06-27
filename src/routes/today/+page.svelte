<script lang="ts">
	import HabitRow from '$lib/components/HabitRow.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Today · Looplog</title>
</svelte:head>

<section class="page">
	<header class="page__header">
		<h1>Today</h1>
		<div class="day-nav">
			<a href="/today?date={data.prevDateKey}" aria-label="Previous day">←</a>
			<span>{data.dateKey}</span>
			<a href="/today?date={data.nextDateKey}" aria-label="Next day">→</a>
		</div>
	</header>

	{#if data.timedHabits.length === 0}
		<div class="empty">
			<p>No timed habits scheduled for this day.</p>
			<a href="/habits/new">Create one</a>
		</div>
	{:else}
		<div class="list">
			{#each data.timedHabits as habit (habit.id)}
				<HabitRow {habit} log={habit.log} />
			{/each}
		</div>
	{/if}

	<a class="fab" href="/habits/new" aria-label="Create habit">+</a>
</section>

<style>
	.page__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.page__header h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.day-nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #b8c2cf;
		font-size: 0.9rem;
	}

	.day-nav a {
		text-decoration: none;
		color: #7dd3fc;
	}

	.list {
		display: grid;
		gap: 0.75rem;
	}

	.empty {
		padding: 2rem 1rem;
		text-align: center;
		border-radius: 1rem;
		background: #121821;
	}

	.empty a {
		color: #7dd3fc;
	}

	.fab {
		position: fixed;
		right: 1rem;
		bottom: 5.5rem;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: #0284c7;
		color: white;
		text-decoration: none;
		font-size: 1.75rem;
		font-weight: 500;
		box-shadow: 0 10px 30px rgba(2, 132, 199, 0.35);
	}
</style>
