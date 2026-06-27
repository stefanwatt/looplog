<script lang="ts">
	import noDataIllustration from '$lib/assets/illustrations/no-data.svg';
	import Icon from '$lib/components/Icon.svelte';
	import { mdiCalendarToday } from '@mdi/js';
	import type { Snippet } from 'svelte';

	let {
		message,
		actions
	}: {
		message: string;
		actions?: Snippet;
	} = $props();

	const dayButtonClass =
		'mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-blue px-5 py-3 font-semibold text-white no-underline';
</script>

<div
	class="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl bg-surface-0/40 px-4 py-8 text-center"
>
	<img
		src={noDataIllustration}
		alt=""
		class="mb-4 max-h-56 w-full max-w-sm object-contain"
	/>
	<p class="m-0">{message}</p>
	{#if actions}
		{@render actions()}
	{:else}
		<a href="/day" class="mt-3 text-blue">Check Day for earlier habits</a>
		<a href="/day" class={dayButtonClass}>
			<Icon path={mdiCalendarToday} size={20} />
			Go to Day
		</a>
	{/if}
</div>
