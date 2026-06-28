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

	<div class="flex min-h-0 flex-1 flex-col justify-center px-5">
		<div class="w-full shrink-0 {CARD_IMAGE_HEIGHT_CLASS} rounded-lg bg-surface-0/15"></div>
	</div>

	<div class="shrink-0 px-5 pt-2 pb-4">
		<div class="h-10 rounded-lg bg-surface-0/10"></div>
	</div>
</div>
