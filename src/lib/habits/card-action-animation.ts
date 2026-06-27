export type CardStampVariant = 'yellow' | 'green' | 'red';

export const CARD_STAMP_HOLD_MS = 650;
export const CARD_SWIPE_ACTION_THRESHOLD_PX = 160;
export const CARD_EXIT_SWIPE_PX = 420;
export const CARD_EXIT_MS = 280;

export type CardActionStampType = 'nailed-it' | 'success' | 'failure';

export type CardActionStampConfig = {
	label: string;
	variant: CardStampVariant;
	exitDirection: 'left' | 'right';
};

export const CARD_ACTION_STAMPS: Record<CardActionStampType, CardActionStampConfig> = {
	'nailed-it': { label: 'Nailed it', variant: 'yellow', exitDirection: 'right' },
	success: { label: 'Success', variant: 'green', exitDirection: 'right' },
	failure: { label: 'Failure', variant: 'red', exitDirection: 'left' }
};

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
