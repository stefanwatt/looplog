declare module '@jamescoyle/svelte-icon' {
	import type { Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	const SvgIcon: Component<
		{
			type?: string | null;
			path: string;
			size?: number | string | null;
			viewbox?: string | null;
			flip?: string | null;
			rotate?: number | string;
		} & HTMLAttributes<SVGElement>
	>;
	export default SvgIcon;
}
