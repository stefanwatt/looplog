<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { mdiPlus } from '@mdi/js';
</script>

<a
	href="/habits/new"
	class="grid size-11 shrink-0 place-items-center rounded-full bg-blue text-white no-underline shadow-md shadow-blue/35"
	aria-label="Create habit"
>
	<Icon path={mdiPlus} size={24} />
</a>
