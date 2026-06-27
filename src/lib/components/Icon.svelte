<script lang="ts">
	import SvgIcon from '@jamescoyle/svelte-icon';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		path,
		size = 24,
		class: className = '',
		label,
		...rest
	}: {
		path: string;
		size?: number | string;
		class?: string;
		label?: string;
	} & HTMLAttributes<SVGElement> = $props();
</script>

<SvgIcon
	type="mdi"
	{path}
	{size}
	class="inline-block shrink-0 {className}"
	aria-hidden={label ? undefined : true}
	aria-label={label}
	{...rest}
/>
