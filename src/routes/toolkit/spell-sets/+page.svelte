<script lang="ts">
	import { onMount } from 'svelte'
	import type { SpellEntry } from '$lib/types/spell'
	import SpellCard from '$lib/components/dnd/SpellCard.svelte'
	import AddSpellSheet from '$lib/components/dnd/AddSpellSheet.svelte'

	const LS_KEY = 'dnd-spell-set'
	const LS_NOTICE_KEY = 'dnd-spell-set-notice-seen'

	let spellSet = $state<SpellEntry[]>([])
	let sheetOpen = $state(false)
	let showNotice = $state(false)
	let showDeleteAllConfirm = $state(false)
	let initialized = $state(false)
	let setSearch = $state('')
	let cardHeight = $state(0)
	let expandedCardName = $state<string | null>(null)
	let foldedCards = $state<Set<string>>(new Set())
	let scrollIndex = $state(0)

	let stickyBarEl: HTMLElement | undefined

	const currentSetNames = $derived(new Set(spellSet.map((s) => s.name)))

	const filteredSet = $derived(
		setSearch
			? spellSet.filter((s) => s.name.toLowerCase().includes(setSearch.toLowerCase()))
			: spellSet
	)

	// Whole-card fold (independent of the per-card description expand).
	const allFolded = $derived(spellSet.length > 0 && spellSet.every((s) => foldedCards.has(s.name)))

	function toggleFold(name: string) {
		const next = new Set(foldedCards)
		if (next.has(name)) next.delete(name)
		else next.add(name)
		foldedCards = next
	}

	function toggleFoldAll() {
		foldedCards = allFolded ? new Set() : new Set(spellSet.map((s) => s.name))
	}

	function updateLayout() {
		if (!stickyBarEl) return
		const slot = document.getElementById('slot')
		if (!slot) return
		// available = slot height minus sticky bar
		// grid has p-2 (8px top + 8px bottom = 16px) and gap-2 (8px between rows)
		const available = slot.clientHeight - stickyBarEl.offsetHeight
		if (window.innerWidth < 640) {
			// mobile: 1 row; subtract padding + small buffer so nothing clips
			cardHeight = available - 24
		} else {
			// desktop: 2 rows; subtract padding (16px) + 1 gap (8px), divide by 2
			cardHeight = Math.floor((available - 24) / 2)
		}
	}

	onMount(() => {
		const saved = localStorage.getItem(LS_KEY)
		if (saved) {
			try {
				spellSet = JSON.parse(saved)
			} catch {
				// start fresh
			}
		}
		if (!localStorage.getItem(LS_NOTICE_KEY)) {
			showNotice = true
		}
		initialized = true

		updateLayout()
		const ro = new ResizeObserver(updateLayout)
		if (stickyBarEl) ro.observe(stickyBarEl)
		window.addEventListener('resize', updateLayout)
		return () => {
			ro.disconnect()
			window.removeEventListener('resize', updateLayout)
		}
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_KEY, JSON.stringify(spellSet))
	})

	function addSpell(spell: SpellEntry) {
		if (!currentSetNames.has(spell.name)) {
			spellSet = [...spellSet, spell]
		}
	}

	function removeSpell(name: string) {
		spellSet = spellSet.filter((s) => s.name !== name)
	}

	function dismissNotice() {
		showNotice = false
		localStorage.setItem(LS_NOTICE_KEY, '1')
	}

	function handleLoadFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = () => {
			try {
				const parsed = JSON.parse(reader.result as string)
				if (Array.isArray(parsed)) spellSet = parsed
			} catch {
				alert('Invalid spell set file.')
			}
			input.value = ''
		}
		reader.readAsText(file)
	}

	function handleSaveFile() {
		const blob = new Blob([JSON.stringify(spellSet, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'my-spell-set.json'
		a.click()
		URL.revokeObjectURL(url)
	}

	function scrollCards(dir: 'up' | 'down') {
		const slot = document.getElementById('slot')
		if (!slot) return
		// Fixed step = one card row: wrapper height + the 8px grid row-gap.
		// cardHeight is recomputed on every resize, so the step tracks screen size.
		const pitch = (cardHeight || slot.clientHeight) + 8
		const maxScroll = Math.max(0, slot.scrollHeight - slot.clientHeight)
		const maxIndex = Math.ceil(maxScroll / pitch)
		// Resync if the user scrolled manually away from our tracked row.
		if (Math.abs(slot.scrollTop - scrollIndex * pitch) > pitch / 2) {
			scrollIndex = Math.round(slot.scrollTop / pitch)
		}
		// Snap to an absolute multiple of pitch so rapid clicks never land mid-card.
		scrollIndex = Math.min(Math.max(scrollIndex + (dir === 'down' ? 1 : -1), 0), maxIndex)
		slot.scrollTo({ top: Math.min(scrollIndex * pitch, maxScroll), behavior: 'smooth' })
	}
</script>

<div class="flex flex-col bg-[#F0EDCC] text-[#02343F] min-h-full">
	<!-- Sticky bar: buttons always visible; search+nav mobile only -->
	<div bind:this={stickyBarEl} class="sticky top-0 z-10 bg-[#F0EDCC] border-b border-[#02343F]/20 px-3 py-2 sm:px-4 shrink-0">
		{#if showNotice}
			<div class="flex flex-wrap items-center justify-between gap-1 mb-2 bg-blue-50 rounded px-2 py-1 text-xs border border-blue-200">
				<span>Auto-saves to browser. Use <strong>Save Set</strong> to export.</span>
				<button class="btn btn-xs btn-ghost" onclick={dismissNotice}>✕</button>
			</div>
		{/if}

		<!-- Row 1: action buttons -->
		<div class="flex gap-1.5 items-center flex-nowrap">
			<label class="btn btn-xs sm:btn-sm btn-outline cursor-pointer shrink-0">
				Load
				<input type="file" accept=".json" class="hidden" onchange={handleLoadFile} />
			</label>

			<button
				class="btn btn-xs sm:btn-sm btn-outline shrink-0"
				onclick={handleSaveFile}
				disabled={spellSet.length === 0}
			>Save</button>

			<button
				class="btn btn-xs sm:btn-sm btn-primary shrink-0"
				onclick={() => (sheetOpen = true)}
			>+ Add</button>

			{#if spellSet.length > 0}
				<button
					class="btn btn-xs sm:btn-sm btn-outline shrink-0"
					onclick={toggleFoldAll}
				>{allFolded ? 'Expand all' : 'Fold all'}</button>
			{/if}

			{#if spellSet.length > 0}
				{#if showDeleteAllConfirm}
					<button
						class="btn btn-xs sm:btn-sm btn-error shrink-0"
						onclick={() => { spellSet = []; showDeleteAllConfirm = false }}
					>Confirm</button>
					<button
						class="btn btn-xs sm:btn-sm btn-ghost shrink-0"
						onclick={() => (showDeleteAllConfirm = false)}
					>Cancel</button>
				{:else}
					<button
						class="btn btn-xs sm:btn-sm btn-outline btn-error shrink-0"
						onclick={() => (showDeleteAllConfirm = true)}
					>Delete All</button>
				{/if}
			{/if}

			<span class="ml-auto text-xs opacity-50 shrink-0">
				{filteredSet.length}{filteredSet.length !== spellSet.length ? `/${spellSet.length}` : ''} spell{spellSet.length !== 1 ? 's' : ''}
			</span>
		</div>

		<!-- Row 2: search + scroll nav -->
		<div class="flex gap-1.5 items-center mt-1.5">
			<input
				type="search"
				placeholder="Search cards..."
				bind:value={setSearch}
				class="input input-xs flex-1 bg-white border-[#02343F]/30"
			/>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollCards('up')}
				aria-label="Previous card"
				disabled={spellSet.length === 0}
			>▲</button>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollCards('down')}
				aria-label="Next card"
				disabled={spellSet.length === 0}
			>▼</button>
		</div>
	</div>

	<!-- Cards area -->
	{#if filteredSet.length === 0}
		<div class="flex flex-col items-center justify-center py-24 opacity-40 flex-1">
			{#if spellSet.length === 0}
				<p class="text-xl mb-2">No spells yet</p>
				<p class="text-sm">Tap "+ Add" to build your set</p>
			{:else}
				<p class="text-xl mb-2">No matches</p>
				<p class="text-sm">Try a different search</p>
			{/if}
		</div>
	{:else}
		<div
			class="grid gap-2 p-2 items-start"
			style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
		>
			{#each filteredSet as spell (spell.name)}
				<div
					data-card-wrapper
					style={!foldedCards.has(spell.name) && expandedCardName !== spell.name && cardHeight > 0 ? `height: ${cardHeight}px` : ''}
				>
					<SpellCard
						{spell}
						onDelete={() => removeSpell(spell.name)}
						expanded={expandedCardName === spell.name}
						onToggleExpand={() => {
							expandedCardName = expandedCardName === spell.name ? null : spell.name
						}}
						folded={foldedCards.has(spell.name)}
						onToggleFold={() => toggleFold(spell.name)}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<AddSpellSheet
	bind:open={sheetOpen}
	{currentSetNames}
	onAdd={addSpell}
	onRemove={removeSpell}
/>
