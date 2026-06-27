<script lang="ts">
	import type { StatsMetric } from '$lib/habits/stats';
	import { formatMetricValue } from '$lib/habits/stats';

	let {
		label,
		metric,
		value,
		href,
		transitionName
	}: {
		label: string;
		metric: StatsMetric;
		value: number | null;
		href: string;
		transitionName?: string;
	} = $props();
</script>

<a
	{href}
	class="flex min-h-[4.75rem] flex-col justify-between rounded-2xl border border-surface-0/40 bg-surface-0/40 px-3 py-3 no-underline text-inherit transition active:bg-surface-0/60"
	style:view-transition-name={transitionName}
>
	<span class="text-xs font-semibold tracking-wide text-subtext-0 uppercase">{label}</span>
	<span class="text-2xl font-bold tabular-nums">{formatMetricValue(metric, value)}</span>
</a>
