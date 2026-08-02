<script lang="ts">
	// Bottom-sheet shell shared across features — gym, guitar and the D&D toolkit. Same idiom as
	// AddSpellSheet.svelte and the nav drawer: a backdrop that closes on click, a panel that flies up,
	// Escape to dismiss.
	//
	// Three things it has to do that a plain sheet doesn't:
	//  - `fullScreen` takes it edge to edge and over the site header and footer, which is what edit and
	//    workout mode are: you are in the workout, not on a page that has a workout on it.
	//  - `header`/`footer` snippets sit outside the scroller, so Edit and Start stay reachable however
	//    long the exercise list runs — a day with 9 lifts must not bury its own primary action.
	//  - `dismissable={false}` for surfaces that own an explicit exit (Finish / Cancel workout).
	//    Escape and a backdrop tap are how a workout gets lost by accident.
	import { onMount, type Snippet } from 'svelte'
	import { fade, fly } from 'svelte/transition'

	let {
		open = false,
		title,
		onClose,
		fullScreen = false,
		tall = false,
		dismissable = true,
		header,
		footer,
		children
	}: {
		open?: boolean
		title: string
		onClose: () => void
		fullScreen?: boolean
		/**
		 * Fixed height instead of fitting the content. For sheets whose content folds open and shut
		 * under the user's thumb — a panel that grows as you open a group moves the row you were
		 * aiming at. Costs a half-empty panel when the list is filtered down to one group, which is
		 * the cheaper of the two.
		 */
		tall?: boolean
		dismissable?: boolean
		header?: Snippet
		footer?: Snippet
		children: Snippet
	} = $props()

	let reduce = $state(false)
	onMount(() => {
		reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
	})
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && dismissable && e.key === 'Escape') onClose()
	}}
/>

{#if open}
	<!--
		Layering, not DOM order. A sheet is only ever opened *on top of* a full-screen drawer, never
		under one, so the two cases get their own bands: full-screen at 40/50, everything else at 60/70.
		Painting them all at 50 left a sheet's backdrop beneath the drawer it was covering — no scrim,
		and the drawer's own Save and Finish buttons stayed live behind the sheet, where tapping Save
		committed and unmounted the editor while its exercise picker was still open on it.
		(The site nav drawer owns 100/101 and stays above both bands.)
	-->
	{#if !fullScreen}
		<button
			class="fixed inset-0 bg-black/50 z-[60] cursor-default border-none outline-none"
			transition:fade={{ duration: reduce ? 0 : 150 }}
			onclick={() => dismissable && onClose()}
			aria-label="Close {title}"
		></button>
	{/if}

	<div
		class="fixed bg-cream text-teal flex flex-col shadow-2xl
			{fullScreen
			? 'inset-0 z-50'
			: `bottom-0 left-0 right-0 rounded-t-2xl z-[70] ${tall ? 'h-[85dvh]' : 'max-h-[85dvh]'}`}"
		transition:fly={{ y: reduce ? 0 : 500, duration: reduce ? 0 : 300, opacity: 1 }}
		role="dialog"
		aria-modal="true"
		aria-label={title}
		tabindex="-1"
	>
		{#if header}
			<!-- Same measure as the body: on a desktop the panel is full-bleed, and a Save button pinned
			     to a 1500px-wide edge loses the column its content lives in. -->
			<div class="shrink-0 border-b border-teal/20">
				<div class="max-w-2xl w-full mx-auto">{@render header()}</div>
			</div>
		{:else}
			<div class="flex justify-center pt-2 pb-1 shrink-0">
				<div class="w-10 h-1 bg-teal/30 rounded-full"></div>
			</div>
			<div class="flex items-center gap-2 px-4 pb-2 border-b border-teal/20 shrink-0">
				<h2 class="font-bold">{title}</h2>
				<button class="btn btn-sm btn-ghost ml-auto" onclick={onClose}>Close</button>
			</div>
		{/if}

		<!-- overscroll-contain: the page behind is itself a scroller (#slot), and chaining a flick
		     through to it while a sheet is open reads as the sheet losing its place. -->
		<div class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
			<div class="p-3 flex flex-col gap-3 max-w-2xl w-full mx-auto">
				{@render children()}
			</div>
		</div>

		{#if footer}
			<div
				class="shrink-0 border-t border-teal/20 bg-cream"
				style="padding-bottom: env(safe-area-inset-bottom, 0px)"
			>
				<div class="max-w-2xl w-full mx-auto">{@render footer()}</div>
			</div>
		{/if}
	</div>
{/if}
