import { parseTimeToMinutes } from '$lib/habits/adherence';

export const DEFAULT_LOG_STEP = 5;

export function clampDayMinutes(minutes: number): number {
	return Math.max(0, Math.min(24 * 60 - 1, minutes));
}

export function minutesToTimeString(minutes: number): string {
	const hours = Math.floor(minutes / 60) % 24;
	const mins = minutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export type QuickOption = {
	value: number;
	label: string;
};

function niceStepForTarget(target: number): number {
	const ideal = target / 5;
	if (ideal <= 1) return 1;

	const magnitude = 10 ** Math.floor(Math.log10(ideal));
	for (const nice of [10, 5, 2, 1]) {
		const step = nice * magnitude;
		if (step <= ideal) return step;
	}

	return magnitude;
}

export function quickTargetOptions(target: number): QuickOption[] {
	if (target <= 1) return [];

	const step = niceStepForTarget(target);
	const options: QuickOption[] = [];

	for (let multiplier = 1; multiplier <= 5; multiplier += 1) {
		const value = multiplier * step;
		if (value >= target) break;
		options.push({ value, label: String(value) });
	}

	return options;
}

export function quickTimeOptions(
	targetTime: string,
	step: number,
	grace: number,
	nowMinutes?: number | null
): QuickOption[] {
	const target = parseTimeToMinutes(targetTime);
	const candidates = [
		{ offset: 0, label: 'Exact', priority: 0 },
		{ offset: step, label: `+${step}m`, priority: 1 },
		{ offset: -step, label: `−${step}m`, priority: 2 },
		{ offset: grace, label: `+${grace}m`, priority: 3 },
		{ offset: -step * 2, label: `−${step * 2}m`, priority: 4 },
		{ offset: step * 2, label: `+${step * 2}m`, priority: 5 }
	];

	const options: QuickOption[] = [];
	const seen = new Set<number>();

	for (const candidate of candidates.sort((a, b) => a.priority - b.priority)) {
		const minutes = clampDayMinutes(target + candidate.offset);
		if (seen.has(minutes)) continue;
		seen.add(minutes);
		options.push({ value: minutes, label: candidate.label });
		if (options.length >= 5) break;
	}

	if (nowMinutes != null) {
		const minutes = clampDayMinutes(nowMinutes);
		if (!seen.has(minutes)) {
			if (options.length >= 5) options.pop();
			options.push({ value: minutes, label: 'Now' });
		}
	}

	return options.sort((a, b) => a.value - b.value);
}
