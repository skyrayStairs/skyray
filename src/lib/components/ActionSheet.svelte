<script lang="ts">
	// A list of choices as a bottom sheet, not a dropdown. Two reasons it isn't a dropdown: every
	// caller is a ⋯ button sitting inside a scroller, where an absolutely positioned menu gets clipped
	// at the wrong moment, and a menu anchored to the top of a phone screen is the one place a thumb
	// can't reach. Rows are full-width so the target is the row, not the label.
	import Sheet from './Sheet.svelte'

	type Action = {
		label: string
		/** Second line — what the choice will actually do, when the label can't say it alone. */
		detail?: string
		danger?: boolean
		disabled?: boolean
		onSelect: () => void
	}

	let {
		open = false,
		title,
		actions,
		onClose
	}: { open?: boolean; title: string; actions: Action[]; onClose: () => void } = $props()
</script>

<Sheet {open} {title} {onClose}>
	<ul class="flex flex-col gap-1 -m-1">
		<!-- Keyed by position, not label: callers build these from user-named things (routines), and two
			 can share a name — a duplicate key is a hard error. The list is static while the sheet is open. -->
		{#each actions as a, i (i)}
			<li>
				<button
					class="w-full text-left rounded-lg px-3 py-3 flex flex-col gap-0.5
						disabled:opacity-40 disabled:cursor-not-allowed
						{a.danger ? 'text-error hover:bg-error/10' : 'hover:bg-teal/10'}"
					disabled={a.disabled}
					onclick={() => {
						a.onSelect()
						onClose()
					}}
				>
					<span class="font-medium">{a.label}</span>
					{#if a.detail}
						<span class="text-xs {a.danger ? 'text-error/80' : 'opacity-70'}">{a.detail}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</Sheet>
