<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<footer
	class="fixed right-0 left-0 z-10 border-t border-surface-0/50 bg-base/95 px-4 pt-3 pb-2 backdrop-blur-md bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
>
	<div class="mx-auto flex max-w-lg gap-3">
		{@render children()}
	</div>
</footer>
