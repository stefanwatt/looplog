<script lang="ts">
	import type { HabitWithLog } from '$lib/database.types';
	import type { HabitLogPayload } from '$lib/habits/log-actions';
	import {
		canCheckHabit,
		canNailIt,
		checkPayload,
		failPayload,
		nailedItPayload,
		type HabitCardForm
	} from '$lib/habits/card-actions';
	import HabitActionBar from '$lib/components/HabitActionBar.svelte';
	import SwipeHabitCard from '$lib/components/SwipeHabitCard.svelte';

	let {
		habit,
		timezone,
		canSkip = false,
		busy = false,
		onlog,
		onskip
	}: {
		habit: HabitWithLog;
		timezone: string;
		canSkip?: boolean;
		busy?: boolean;
		onlog: (payload: HabitLogPayload) => Promise<void>;
		onskip?: () => Promise<void>;
	} = $props();

	let actualValue = $state<number | null>(null);
	let actualTime = $state('');
	let satisfaction = $state<number | null>(null);
	let touched = $state(false);

	const currentForm = $derived<HabitCardForm>({
		actualValue,
		actualTime,
		satisfaction,
		touched
	});

	const canCheck = $derived(canCheckHabit(habit, currentForm));
	const canNailItAction = $derived(canNailIt(habit));

	async function handleFail() {
		if (busy) return;
		await onlog(failPayload(habit));
	}

	async function handleCheck() {
		if (busy || !canCheck) return;
		await onlog(checkPayload(habit, currentForm));
	}

	async function handleNailedIt() {
		if (busy || !canNailItAction) return;
		await onlog(nailedItPayload(habit, timezone));
	}

	async function handleSkip() {
		if (busy || !canSkip || !onskip) return;
		await onskip();
	}
</script>

<div class="grid gap-3">
	<SwipeHabitCard
		{habit}
		{timezone}
		hideLog
		{busy}
		bind:actualValue
		bind:actualTime
		bind:satisfaction
		bind:touched
		onfail={handleFail}
		oncheck={handleCheck}
	/>
	<HabitActionBar
		canSkip={canSkip}
		{canCheck}
		canNailIt={canNailItAction}
		{busy}
		onfail={handleFail}
		onnailedit={handleNailedIt}
		oncheck={handleCheck}
		onskip={handleSkip}
	/>
</div>
