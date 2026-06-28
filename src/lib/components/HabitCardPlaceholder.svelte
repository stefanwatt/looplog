<script lang="ts">
	const CARD_IMAGE_HEIGHT_CLASS = 'h-36 sm:h-40';
</script>

<div
	class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-0/50 bg-surface-1 shadow-xl shadow-crust/50"
	aria-hidden="true"
>
	<div class="shrink-0 px-5 pt-4 pb-2">
		<div class="h-7 w-2/3 max-w-48 rounded-lg bg-surface-0/35"></div>
	</div>

	<div class="shrink-0 {CARD_IMAGE_HEIGHT_CLASS} bg-surface-0/15"></div>

	<div class="min-h-0 flex-1 shrink-0 bg-surface-0/10"></div>
</div>
