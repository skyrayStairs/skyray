<script lang="ts">
	import type { SpellEntry } from '$lib/types/spell'

	let {
		spell,
		onDelete,
		expanded = false,
		onToggleExpand
	}: {
		spell: SpellEntry
		onDelete?: () => void
		expanded?: boolean
		onToggleExpand?: () => void
	} = $props()

	const SCHOOL_CLASSES: Record<string, string> = {
		abjuration: 'bg-[#1a5276] border-[#1a5276]',
		conjuration: 'bg-[#6c3483] border-[#6c3483]',
		divination: 'bg-[#2e4057] border-[#2e4057]',
		enchantment: 'bg-[#76448a] border-[#76448a]',
		evocation: 'bg-[#922b21] border-[#922b21]',
		illusion: 'bg-[#148f77] border-[#148f77]',
		necromancy: 'bg-[#1c2833] border-[#1c2833]',
		transmutation: 'bg-[#1e8449] border-[#1e8449]'
	}

	let showDeleteConfirm = $state(false)
	let hasOverflow = $state(false)
	let descriptionEl: HTMLElement | undefined

	const schoolClasses = $derived(SCHOOL_CLASSES[spell.school] ?? 'bg-gray-700 border-gray-700')
	const levelLabel = $derived(spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`)
	const schoolLabel = $derived(spell.school.charAt(0).toUpperCase() + spell.school.slice(1))

	function renderMarkdown(text: string): string {
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>')
	}

	// Detect whether description overflows its box (only meaningful when !expanded)
	$effect(() => {
		if (!descriptionEl) return
		const check = () => {
			hasOverflow = descriptionEl!.scrollHeight > descriptionEl!.clientHeight + 1
		}
		const ro = new ResizeObserver(check)
		ro.observe(descriptionEl)
		check()
		return () => ro.disconnect()
	})
</script>

<!--
  h-full when not expanded (fills fixed-height wrapper in grid).
  h-auto when expanded: card grows to content, wrapper drops its height
  constraint in the parent, grid row expands, page body extends.
-->
<div
	class="rounded-lg border-4 p-1.5 shadow-md flex flex-col {schoolClasses}"
	class:h-full={!expanded}
	class:h-auto={expanded}
	class:shadow-2xl={expanded}
>
	<!-- Title + delete button inline -->
	<div class="bg-white rounded px-2 py-1 mb-1 shrink-0 flex items-center gap-1 min-w-0">
		<p class="flex-1 font-bold text-sm tracking-wider uppercase leading-tight text-center min-w-0 break-words">{spell.name}</p>
		{#if onDelete}
			{#if showDeleteConfirm}
				<button
					class="btn btn-xs btn-error shrink-0"
					onclick={() => { onDelete?.(); showDeleteConfirm = false }}
				>Remove</button>
				<button
					class="btn btn-xs btn-ghost text-gray-500 shrink-0"
					onclick={() => (showDeleteConfirm = false)}
				>✕</button>
			{:else}
				<button
					class="btn btn-xs btn-ghost shrink-0 text-gray-400 opacity-40 hover:opacity-80 min-h-0 h-auto p-0.5"
					onclick={() => (showDeleteConfirm = true)}
					aria-label="Remove spell"
				>✕</button>
			{/if}
		{/if}
	</div>

	<!-- 2x2 grid -->
	<div class="grid grid-cols-2 gap-px mb-1 shrink-0">
		<div class="bg-white p-1.5">
			<p class="text-[9px] uppercase font-bold tracking-wide text-gray-500">Casting Time</p>
			<p class="text-xs font-medium leading-tight">{spell.castingTime}</p>
		</div>
		<div class="bg-white p-1.5">
			<p class="text-[9px] uppercase font-bold tracking-wide text-gray-500">Range</p>
			<p class="text-xs font-medium leading-tight">{spell.range}</p>
		</div>
		<div class="bg-white p-1.5">
			<p class="text-[9px] uppercase font-bold tracking-wide text-gray-500">Components</p>
			<p class="text-xs font-medium leading-tight">{spell.components}</p>
		</div>
		<div class="bg-white p-1.5">
			<p class="text-[9px] uppercase font-bold tracking-wide text-gray-500">Duration</p>
			<p class="text-xs font-medium leading-tight">{spell.concentration ? 'Conc. ' : ''}{spell.duration}</p>
		</div>
	</div>

	<!-- Material component -->
	{#if spell.material}
		<div class="bg-white rounded px-2 py-0.5 mb-1 shrink-0">
			<p class="text-[10px] italic text-gray-600 leading-tight">M: {spell.material}</p>
		</div>
	{/if}

	<!--
	  Description:
	  - Not expanded: flex-1 min-h-0 overflow-y-auto (fills card height, scrolls if overflowing)
	  - Expanded: auto height, no overflow clipping — shows all text
	-->
	<div class="relative mb-1" class:flex-1={!expanded} class:min-h-0={!expanded}>
		<div
			bind:this={descriptionEl}
			class="bg-white rounded px-2 py-1.5 text-xs leading-snug"
			class:h-full={!expanded}
			class:overflow-y-auto={!expanded}
		>
			<div class={hasOverflow || expanded ? 'pr-4' : ''}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html renderMarkdown(spell.description)}
				{#if spell.atHigherLevels}
					<p class="mt-1.5 pt-1.5 border-t border-gray-200 text-[10px]">
						<strong>At Higher Levels:</strong>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderMarkdown(spell.atHigherLevels)}
					</p>
				{/if}
			</div>
		</div>

		{#if (hasOverflow || expanded) && onToggleExpand}
			<button
				class="hidden sm:flex absolute top-1 right-1 w-5 h-5 items-center justify-center
				       bg-white border border-gray-300 rounded text-[9px] text-gray-400
				       hover:text-gray-700 hover:border-gray-500 z-10 shadow-sm"
				onclick={onToggleExpand}
				title={expanded ? 'Collapse' : 'Expand description'}
				aria-label={expanded ? 'Collapse description' : 'Expand description'}
			>{expanded ? '▲' : '▼'}</button>
		{/if}
	</div>

	<!-- Footer -->
	<div class="flex justify-between items-end px-0.5 shrink-0">
		<p class="text-[9px] text-white leading-tight flex-1 mr-1 truncate">{spell.classes.join(', ')}</p>
		<p class="text-[9px] text-white whitespace-nowrap leading-tight">
			{schoolLabel} · {levelLabel}{spell.ritual ? ' (R)' : ''}
		</p>
	</div>
</div>
