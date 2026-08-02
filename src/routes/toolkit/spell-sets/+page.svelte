<script lang="ts">
	import { onMount } from 'svelte'
	import type { SpellEntry } from '$lib/types/spell'
	import SpellCard, { SCHOOL_CLASSES, SCHOOL_FALLBACK } from '$lib/components/dnd/SpellCard.svelte'
	import AddSpellSheet from '$lib/components/dnd/AddSpellSheet.svelte'
	import { downloadJson, readJsonFile } from '$lib/utils/fileIO'
	import { scrollGroups } from '$lib/utils/scrollGroups'
	import ToolSwitcherSheet from '$lib/components/dnd/ToolSwitcherSheet.svelte'

	const LS_KEY = 'dnd-spell-set'
	const LS_PREPARED = 'dnd-prepared'
	const LS_NOTICE_KEY = 'dnd-spell-set-notice-seen'
	const LS_SORT = 'dnd-spell-sort'

	let spellSet = $state<SpellEntry[]>([]) // = Known (the full collection)
	let preparedNames = $state<Set<string>>(new Set())
	let activeTab = $state<'prepared' | 'known'>('prepared')
	let sheetOpen = $state(false)
	let toolSheetOpen = $state(false)
	let showNotice = $state(false)
	let showDeleteAllConfirm = $state(false)
	let initialized = $state(false)
	let setSearch = $state('')
	let cardHeight = $state(0)
	let expandedCardName = $state<string | null>(null)
	// Fold state is tracked per tab: a spell that is both Known and Prepared would
	// otherwise share one fold flag, so "Fold/Expand all" would leak across tabs.
	let foldedPrepared = $state<Set<string>>(new Set())
	let foldedKnown = $state<Set<string>>(new Set())

	type SortKey = 'name' | 'level' | 'school'
	const SORT_OPTIONS: { key: SortKey; label: string }[] = [
		{ key: 'name', label: 'Alphabetical' },
		{ key: 'level', label: 'Level' },
		{ key: 'school', label: 'School' }
	]
	let sortKey = $state<SortKey>('name')
	let sortDir = $state<'asc' | 'desc'>('asc')
	let sortMenuOpen = $state(false)

	let stickyBarEl: HTMLElement | undefined

	const currentSetNames = $derived(new Set(spellSet.map((s) => s.name)))

	const preparedCount = $derived(spellSet.filter((s) => preparedNames.has(s.name)).length)

	// Base list for the active tab: Prepared = prepared subset of Known; Known = everything.
	const baseSet = $derived(
		activeTab === 'prepared' ? spellSet.filter((s) => preparedNames.has(s.name)) : spellSet
	)

	const filteredSet = $derived(
		setSearch
			? baseSet.filter((s) => s.name.toLowerCase().includes(setSearch.toLowerCase()))
			: baseSet
	)

	// Non-destructive sort: reorders only the displayed list, not the saved set.
	// Name is the tiebreaker for every key, and the sole comparison for 'name'.
	const displaySet = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1
		return [...filteredSet].sort((a, b) => {
			let cmp = 0
			if (sortKey === 'level') cmp = a.level - b.level
			else if (sortKey === 'school') cmp = a.school.localeCompare(b.school)
			return (cmp || a.name.localeCompare(b.name)) * dir
		})
	})

	// The grouping the current sort produces: same key = same heading block.
	function groupKey(s: SpellEntry): string {
		if (sortKey === 'level') return String(s.level)
		if (sortKey === 'school') return s.school
		return s.name.charAt(0).toUpperCase()
	}

	function groupLabel(s: SpellEntry): string {
		if (sortKey === 'level') return s.level === 0 ? 'Cantrips' : `Level ${s.level}`
		if (sortKey === 'school') return s.school.charAt(0).toUpperCase() + s.school.slice(1)
		return s.name.charAt(0).toUpperCase()
	}

	// Heading pills mirror the card colours when grouping by school; teal otherwise.
	function groupPillClass(s: SpellEntry): string {
		return sortKey === 'school' ? (SCHOOL_CLASSES[s.school] ?? SCHOOL_FALLBACK) : 'bg-teal'
	}

	// Non-null only at the first card of each group — that card carries the heading.
	const groupHeads = $derived(
		displaySet.map((s, i) => (i === 0 || groupKey(displaySet[i - 1]) !== groupKey(s) ? s : null))
	)

	function groupCount(s: SpellEntry): number {
		const k = groupKey(s)
		return displaySet.filter((x) => groupKey(x) === k).length
	}

	// Fold set for the active tab only — keeps Prepared/Known fold state independent.
	const foldedCards = $derived(activeTab === 'prepared' ? foldedPrepared : foldedKnown)

	// Whole-card fold (independent of the per-card description expand); applies to visible cards.
	const allFolded = $derived(displaySet.length > 0 && displaySet.every((s) => foldedCards.has(s.name)))

	function setFolded(next: Set<string>) {
		if (activeTab === 'prepared') foldedPrepared = next
		else foldedKnown = next
	}

	function toggleFold(name: string) {
		const next = new Set(foldedCards)
		if (next.has(name)) next.delete(name)
		else next.add(name)
		setFolded(next)
	}

	function toggleFoldAll() {
		// only affect the cards visible in the active tab; leave the other tab's folds intact
		const visible = displaySet.map((s) => s.name)
		const next = new Set(foldedCards)
		if (allFolded) for (const n of visible) next.delete(n)
		else for (const n of visible) next.add(n)
		setFolded(next)
	}

	function prepare(name: string) {
		if (preparedNames.has(name)) return
		const next = new Set(preparedNames)
		next.add(name)
		preparedNames = next
	}

	function unprepare(name: string) {
		if (!preparedNames.has(name)) return
		const next = new Set(preparedNames)
		next.delete(name)
		preparedNames = next
	}

	// Double-tap shortcut for the swipe: flip prepared state either direction.
	function togglePrepare(name: string) {
		if (preparedNames.has(name)) unprepare(name)
		else prepare(name)
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

		const savedPrepared = localStorage.getItem(LS_PREPARED)
		const known = new Set(spellSet.map((s) => s.name))
		if (savedPrepared) {
			try {
				const names: string[] = JSON.parse(savedPrepared)
				preparedNames = new Set(names.filter((n) => known.has(n))) // drop stale names
			} catch {
				preparedNames = new Set()
			}
		} else if (spellSet.length > 0) {
			// migrate old users (no prepared key): everything they had counts as prepared
			preparedNames = new Set(known)
		}

		const savedSort = localStorage.getItem(LS_SORT)
		if (savedSort) {
			try {
				const { key, dir } = JSON.parse(savedSort)
				if (SORT_OPTIONS.some((o) => o.key === key)) sortKey = key
				if (dir === 'asc' || dir === 'desc') sortDir = dir
			} catch {
				// keep defaults
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

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_PREPARED, JSON.stringify([...preparedNames]))
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_SORT, JSON.stringify({ key: sortKey, dir: sortDir }))
	})

	// Reset scroll position when switching tabs (list length differs).
	$effect(() => {
		activeTab // track
		const slot = document.getElementById('slot')
		if (slot) slot.scrollTop = 0
	})

	function addSpell(spell: SpellEntry) {
		if (!currentSetNames.has(spell.name)) {
			spellSet = [...spellSet, spell]
		}
	}

	function removeSpell(name: string) {
		spellSet = spellSet.filter((s) => s.name !== name)
		unprepare(name) // a deleted spell can't stay prepared
	}

	function dismissNotice() {
		showNotice = false
		localStorage.setItem(LS_NOTICE_KEY, '1')
	}

	let loadError = $state('')

	async function handleLoadFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		loadError = ''
		try {
			const parsed = (await readJsonFile(file)) as
				| SpellEntry[]
				| { known?: SpellEntry[]; prepared?: string[] }
			if (Array.isArray(parsed)) {
				// old shape: a bare array of spells → load as Known, mark all prepared
				spellSet = parsed
				preparedNames = new Set(parsed.map((s: SpellEntry) => s.name))
			} else if (parsed && Array.isArray(parsed.known)) {
				spellSet = parsed.known
				const known = new Set(spellSet.map((s) => s.name))
				preparedNames = new Set((parsed.prepared ?? []).filter((n: string) => known.has(n)))
			} else {
				loadError = 'Invalid spell set file.'
			}
		} catch {
			alert('Invalid spell set file.')
		}
		input.value = ''
	}

	function handleSaveFile() {
		downloadJson('my-spell-set.json', { known: spellSet, prepared: [...preparedNames] })
	}

</script>

<div class="flex flex-col bg-cream text-teal min-h-full">
	<!-- Sticky bar: buttons always visible; search+nav mobile only -->
	<div bind:this={stickyBarEl} class="sticky top-0 z-10 bg-cream border-b border-teal/20 px-3 py-2 sm:px-4 shrink-0">
		{#if showNotice}
			<div class="flex flex-wrap items-center justify-between gap-1 mb-2 bg-blue-50 rounded px-2 py-1 text-xs border border-blue-200">
				<span>Auto-saves to browser. Use <strong>Save Set</strong> to export.</span>
				<button class="btn btn-xs btn-ghost" onclick={dismissNotice}>✕</button>
			</div>
		{/if}

		{#if loadError}
			<div class="flex items-center justify-between gap-1 mb-2 bg-error/10 text-error rounded px-2 py-1 text-xs border border-error/30" role="alert">
				<span>{loadError}</span>
				<button class="btn btn-xs btn-ghost" onclick={() => (loadError = '')} aria-label="Dismiss error">✕</button>
			</div>
		{/if}

		<!-- Tabs: Prepared (default) / Known -->
		<div class="flex gap-1 mb-2">
			<button
				class="btn btn-xs sm:btn-sm flex-1 {activeTab === 'prepared' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => (activeTab = 'prepared')}
			>Prepared ({preparedCount})</button>
			<button
				class="btn btn-xs sm:btn-sm flex-1 {activeTab === 'known' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => (activeTab = 'known')}
			>Known ({spellSet.length})</button>
		</div>

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

			{#if displaySet.length > 0}
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
				{filteredSet.length}{filteredSet.length !== baseSet.length ? `/${baseSet.length}` : ''} spell{baseSet.length !== 1 ? 's' : ''}
			</span>
		</div>

		<!-- Row 2: search + scroll nav -->
		<div class="flex gap-1.5 items-center mt-1.5">
			<input
				type="search"
				placeholder="Search cards..."
				bind:value={setSearch}
				class="input input-xs flex-1 min-w-0 bg-white border-teal/30"
			/>

			<div class="relative shrink-0">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => (sortMenuOpen = !sortMenuOpen)}
					disabled={displaySet.length === 0}
					aria-haspopup="true"
					aria-expanded={sortMenuOpen}
				>Sort {sortDir === 'asc' ? '↑' : '↓'}</button>

				{#if sortMenuOpen}
					<button
						class="fixed inset-0 z-10 cursor-default"
						onclick={() => (sortMenuOpen = false)}
						aria-label="Close sort menu"
						tabindex="-1"
					></button>
					<div class="absolute right-0 mt-1 z-20 w-36 rounded border border-teal/20 bg-white py-1 text-sm shadow-lg">
						{#each SORT_OPTIONS as opt}
							<button
								class="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-teal/5"
								onclick={() => (sortKey = opt.key)}
							>
								<span>{opt.label}</span>
								{#if sortKey === opt.key}<span>✓</span>{/if}
							</button>
						{/each}
						<div class="my-1 border-t border-teal/10"></div>
						<button
							class="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-teal/5"
							onclick={() => (sortDir = sortDir === 'asc' ? 'desc' : 'asc')}
						>
							<span>Direction</span>
							<span>{sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}</span>
						</button>
					</div>
				{/if}
			</div>

			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollGroups('up', stickyBarEl?.offsetHeight ?? 0)}
				aria-label="Previous group heading"
				disabled={displaySet.length === 0}
			>▲</button>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollGroups('down', stickyBarEl?.offsetHeight ?? 0)}
				aria-label="Next group heading"
				disabled={displaySet.length === 0}
			>▼</button>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => (toolSheetOpen = true)}
				aria-label="Switch tool"
			>☰</button>
		</div>
	</div>

	<!-- Cards area -->
	{#if filteredSet.length === 0}
		<div class="flex flex-col items-center justify-center py-24 opacity-40 flex-1 text-center px-6">
			{#if baseSet.length === 0}
				{#if activeTab === 'prepared'}
					<p class="text-xl mb-2">No prepared spells</p>
					<p class="text-sm">In <strong>Known</strong>, swipe a card right or double-tap it to prepare it</p>
				{:else}
					<p class="text-xl mb-2">No spells yet</p>
					<p class="text-sm">Tap "+ Add" to build your set</p>
				{/if}
			{:else}
				<p class="text-xl mb-2">No matches</p>
				<p class="text-sm">Try a different search</p>
			{/if}
		</div>
	{:else}
		<!--
		  overflow-x: clip contains the swipe transform so a dragged card can't widen the
		  page and make #slot scroll sideways (which then eats further swipes on mobile).
		  Must be `clip`, not `hidden`: `hidden` would coerce overflow-y to auto, turning the
		  grid into its own vertical scroller and breaking #slot scroll + cardHeight math.
		-->
		<div
			class="grid gap-2 p-2 items-start"
			style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); overflow-x: clip"
		>
			{#each displaySet as spell, i (spell.name)}
				{@const head = groupHeads[i]}
				{#if head}
					<!-- col-span-full forces a fresh grid row, so each group starts on its own line -->
					<div data-group-heading class="col-span-full flex items-center gap-2 pt-2 first:pt-0">
						<span class="h-px flex-1 bg-teal/30"></span>
						<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide text-cream {groupPillClass(head)}">
							{groupLabel(head)} · {groupCount(head)}
						</span>
						<span class="h-px flex-1 bg-teal/30"></span>
					</div>
				{/if}
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
						dimmed={activeTab === 'known' && preparedNames.has(spell.name)}
						onSwipeRight={() => prepare(spell.name)}
						onSwipeLeft={() => unprepare(spell.name)}
						onDoubleTap={() => togglePrepare(spell.name)}
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

<ToolSwitcherSheet
	open={toolSheetOpen}
	current="/toolkit/spell-sets"
	onClose={() => (toolSheetOpen = false)}
/>
