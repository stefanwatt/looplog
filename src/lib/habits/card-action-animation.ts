export type CardStampVariant = 'yellow' | 'green' | 'red';

export const CARD_STAMP_HOLD_MS = 650;
export const CARD_SWIPE_ACTION_THRESHOLD_PX = 160;
export const CARD_SWIPE_PREVIEW_START_PX = 20;
export const CARD_EXIT_SWIPE_PX = 420;
export const CARD_EXIT_MS = 280;

export function swipePreviewOpacity(dragX: number): number {
	const distance = Math.abs(dragX);
	if (distance <= CARD_SWIPE_PREVIEW_START_PX) return 0;

	return Math.min(
		(distance - CARD_SWIPE_PREVIEW_START_PX) /
			(CARD_SWIPE_ACTION_THRESHOLD_PX - CARD_SWIPE_PREVIEW_START_PX),
		1
	);
}

export type CardActionStampType = 'nailed-it' | 'success' | 'failure';

export type CardActionStampConfig = {
	label: string;
	variant: CardStampVariant;
	exitDirection: 'left' | 'right';
};

export const CARD_ACTION_STAMPS: Record<CardActionStampType, CardActionStampConfig> = {
	'nailed-it': { label: 'Nailed it', variant: 'yellow', exitDirection: 'right' },
	success: { label: 'Logged', variant: 'green', exitDirection: 'right' },
	failure: { label: 'Failure', variant: 'red', exitDirection: 'left' }
};

export function cardActionStampLabel(
	stamp: CardActionStampType,
	binaryHabit = false
): string {
	if (stamp === 'success' && binaryHabit) return 'Success';
	return CARD_ACTION_STAMPS[stamp].label;
}

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function prefersSimpleCardMotion(): boolean {
	if (typeof matchMedia === 'undefined') return false;
	return matchMedia('(pointer: coarse)').matches;
}

/** GPU-composited drag transform; skips rotation on touch devices. */
export function cardDragTransform(dragX: number): string {
	const x = Math.round(dragX);
	if (prefersSimpleCardMotion()) {
		return `translate3d(${x}px, 0, 0)`;
	}
	return `translate3d(${x}px, 0, 0) rotate(${dragX * 0.04}deg)`;
}

/** GPU-composited stack layer transform for cards behind the active card. */
export function cardStackBehindTransform(translateY: number, scale: number): string {
	const y = Math.round(translateY);
	return `translate3d(0, ${y}px, 0) scale(${scale})`;
}

/** Normalized swipe progress (0–1) for revealing cards behind the active card. */
export function cardStackDragProgress(dragX: number): number {
	return Math.min(Math.abs(dragX) / CARD_SWIPE_ACTION_THRESHOLD_PX, 1);
}
