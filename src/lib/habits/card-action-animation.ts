export const CARD_STAMP_HOLD_MS = 650;
export const CARD_EXIT_SWIPE_PX = 420;
export const CARD_EXIT_MS = 280;

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
