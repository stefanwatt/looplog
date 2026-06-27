<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { mdiCheck, mdiClose, mdiSkipNext, mdiTrophy, mdiUndo } from '@mdi/js';

	let {
		canUndo = false,
		canSkip = false,
		canCheck = false,
		canNailIt = false,
		busy = false,
		onundo,
		onfail,
		onnailedit,
		oncheck,
		onskip
	}: {
		canUndo?: boolean;
		canSkip?: boolean;
		canCheck?: boolean;
		canNailIt?: boolean;
		busy?: boolean;
		onundo?: () => void;
		onfail?: () => void;
		onnailedit?: () => void;
		oncheck?: () => void;
		onskip?: () => void;
	} = $props();

	const sideButtonClass =
		'grid place-items-center rounded-full border border-surface-0/60 bg-surface-1 text-subtext-0 shadow-sm transition enabled:active:scale-95 disabled:opacity-35';
	const mainButtonClass =
		'grid place-items-center rounded-full border-2 shadow-md transition enabled:active:scale-95 disabled:opacity-35';
</script>

<div class="flex items-end justify-center gap-3 px-2 pt-2 pb-1" role="toolbar" aria-label="Habit actions">
	<button
		type="button"
		class="{sideButtonClass} size-11 -translate-y-2"
		disabled={busy || !canUndo}
		aria-label="Undo"
		onclick={() => onundo?.()}
	>
		<Icon path={mdiUndo} size={20} />
	</button>

	<button
		type="button"
		class="{mainButtonClass} size-14 border-red/40 bg-red/10 text-red"
		disabled={busy}
		aria-label="Did not do"
		onclick={() => onfail?.()}
	>
		<Icon path={mdiClose} size={28} />
	</button>

	<button
		type="button"
		class="{mainButtonClass} size-11 border-yellow/40 bg-yellow/10 text-yellow"
		disabled={busy || !canNailIt}
		aria-label="Nailed it"
		onclick={() => onnailedit?.()}
	>
		<Icon path={mdiTrophy} size={22} />
	</button>

	<button
		type="button"
		class="{mainButtonClass} size-14 border-green/40 bg-green/10 text-green"
		disabled={busy || !canCheck}
		aria-label="Did it"
		onclick={() => oncheck?.()}
	>
		<Icon path={mdiCheck} size={28} />
	</button>

	<button
		type="button"
		class="{sideButtonClass} size-11 -translate-y-2"
		disabled={busy || !canSkip}
		aria-label="Skip"
		onclick={() => onskip?.()}
	>
		<Icon path={mdiSkipNext} size={20} />
	</button>
</div>
