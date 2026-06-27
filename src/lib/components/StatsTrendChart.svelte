<script lang="ts">
	import type { DailyStatsPoint, StatsMetric } from '$lib/habits/stats';
	import { chartValue } from '$lib/habits/stats';

	let {
		points,
		metric,
		transitionName
	}: {
		points: DailyStatsPoint[];
		metric: StatsMetric;
		transitionName?: string;
	} = $props();

	const width = 320;
	const height = 160;
	const padding = { top: 12, right: 8, bottom: 28, left: 36 };

	const chartPoints = $derived.by(() => {
		const values = points
			.map((point) => ({ dateKey: point.dateKey, value: chartValue(point, metric) }))
			.filter((point): point is { dateKey: string; value: number } => point.value != null);

		if (values.length === 0) return null;

		const innerWidth = width - padding.left - padding.right;
		const innerHeight = height - padding.top - padding.bottom;
		const maxX = Math.max(values.length - 1, 1);

		return values.map((point, index) => {
			const x = padding.left + (index / maxX) * innerWidth;
			const y = padding.top + innerHeight - (point.value / 100) * innerHeight;
			return { ...point, x, y };
		});
	});

	const linePath = $derived.by(() => {
		if (!chartPoints || chartPoints.length === 0) return '';
		return chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
	});

	const areaPath = $derived.by(() => {
		if (!chartPoints || chartPoints.length === 0) return '';
		const baseline = height - padding.bottom;
		const first = chartPoints[0];
		const last = chartPoints[chartPoints.length - 1];
		const line = chartPoints.map((point) => `L ${point.x} ${point.y}`).join(' ');
		return `M ${first.x} ${baseline} L ${first.x} ${first.y} ${line} L ${last.x} ${baseline} Z`;
	});
</script>

<div
	class="rounded-2xl border border-surface-0/40 bg-surface-0/25 p-3"
	style:view-transition-name={transitionName}
>
	{#if !chartPoints || chartPoints.length === 0}
		<div class="grid h-40 place-items-center text-sm text-subtext-0">No data for this period.</div>
	{:else}
		<svg
			viewBox="0 0 {width} {height}"
			class="h-40 w-full"
			role="img"
			aria-label="Trend chart"
		>
			<defs>
				<linearGradient id="stats-chart-fill" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="var(--ctp-blue)" stop-opacity="0.35" />
					<stop offset="100%" stop-color="var(--ctp-blue)" stop-opacity="0.02" />
				</linearGradient>
			</defs>

			{#each [0, 25, 50, 75, 100] as tick (tick)}
				{@const y = padding.top + (height - padding.top - padding.bottom) * (1 - tick / 100)}
				<line
					x1={padding.left}
					x2={width - padding.right}
					y1={y}
					y2={y}
					stroke="var(--ctp-surface-1)"
					stroke-width="1"
					stroke-dasharray="4 4"
				/>
				<text x={padding.left - 6} y={y + 4} text-anchor="end" fill="var(--ctp-subtext-0)" font-size="10">
					{tick}
				</text>
			{/each}

			<path d={areaPath} fill="url(#stats-chart-fill)" />
			<path
				d={linePath}
				fill="none"
				stroke="var(--ctp-blue)"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			{#each chartPoints as point (point.dateKey)}
				<circle cx={point.x} cy={point.y} r="3.5" fill="var(--ctp-blue)" />
			{/each}

			{#if chartPoints.length <= 8}
				{#each chartPoints as point (point.dateKey)}
					<text
						x={point.x}
						y={height - 8}
						text-anchor="middle"
						fill="var(--ctp-subtext-0)"
						font-size="10"
					>
						{point.dateKey.slice(5)}
					</text>
				{/each}
			{/if}
		</svg>
	{/if}
</div>
