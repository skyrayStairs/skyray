<script lang="ts">
	// The exercise library (req 6): every built-in plus the user's own, with add / rename / delete for
	// custom ones and the cross-routine note for any of them. Opened either from the toolbar or
	// straight from a picker that didn't have the lift — in the latter case `onPick` is set and each
	// row gets a Use button.
	import { EXERCISE_CATALOG, GROUP_NAMES, mergedCatalog } from '$lib/data/exercises'
	import { noteKey, type CustomExercise } from '$lib/types/gym'
	import { uid } from '$lib/utils/id'
	import GymSheet from './GymSheet.svelte'

	let {
		open = false,
		onClose,
		custom,
		onCustomChange,
		notes,
		onNotesChange,
		onPick,
		prefillName = ''
	}: {
		open?: boolean
		onClose: () => void
		custom: CustomExercise[]
		onCustomChange: (list: CustomExercise[]) => void
		notes: Record<string, string>
		onNotesChange: (notes: Record<string, string>) => void
		onPick?: (name: string) => void
		prefillName?: string
	} = $props()

	let newName = $state('')
	let newGroup = $state(GROUP_NAMES[0])
	let renamingId = $state<string | null>(null)
	let renameText = $state('')
	let openNoteKey = $state<string | null>(null)
	let error = $state('')
	let query = $state('')
	let openGroups = $state<Record<string, boolean>>({})

	const catalog = $derived(mergedCatalog(custom))
	// The catalog runs to ~90 lifts across 8 groups. Opened from "+ Add exercise" mid-plan, scrolling
	// it is the slow path; typing three letters is the fast one.
	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase()
		if (!q) return catalog
		return catalog
			.map((g) => ({ group: g.group, names: g.names.filter((n) => n.toLowerCase().includes(q)) }))
			.filter((g) => g.names.length)
	})

	// Folded by default: eight groups of ten lifts is a wall to scroll past when you came here to tap
	// one. Searching opens everything, because a filtered group with nothing showing is just a wrong
	// answer — and once you type, the list is short enough to read whole.
	const isOpen = (group: string) => !!query.trim() || !!openGroups[group]
	const builtInNames = EXERCISE_CATALOG.flatMap((g) => g.names.map((n) => noteKey(n)))
	const isCustom = (name: string) => custom.some((c) => noteKey(c.name) === noteKey(name))

	// This sheet stays mounted for the life of the page, so every open starts from whatever the last
	// one left behind — a search for "Bench Press" made from an editor was still filtering the library
	// when it was next opened from the ⋯ menu. Reset on the closed→open edge, then seed: a picker that
	// opened this sheet passes the half-typed name through as the search term, since the overwhelmingly
	// likely intent is "find the one I already have".
	let wasOpen = false
	$effect(() => {
		if (open === wasOpen) return
		wasOpen = open
		if (!open) return
		newName = ''
		error = ''
		renamingId = null
		openNoteKey = null
		query = prefillName
	})

	function addCustom() {
		// Falls back to the search box: having typed "Zercher" and found nothing, retyping it into a
		// second field to create it is the kind of small tax that makes people give up on a library.
		const name = newName.trim() || query.trim()
		if (!name) return
		const key = noteKey(name)
		if (builtInNames.includes(key) || custom.some((c) => noteKey(c.name) === key)) {
			error = `"${name}" is already in the library.`
			return
		}
		error = ''
		onCustomChange([...custom, { id: uid(), name, group: newGroup }])
		newName = ''
		onPick?.(name) // opened from a picker: adding is also choosing
	}

	function commitRename(c: CustomExercise) {
		const name = renameText.trim()
		renamingId = null
		if (!name || noteKey(name) === noteKey(c.name)) return
		// Log entries store the name as a snapshot and placeholders key off set id, so a rename can't
		// corrupt history — only the note key has to move with it.
		const oldKey = noteKey(c.name)
		if (notes[oldKey]) {
			const next = { ...notes, [noteKey(name)]: notes[oldKey] }
			delete next[oldKey]
			onNotesChange(next)
		}
		onCustomChange(custom.map((x) => (x.id === c.id ? { ...x, name } : x)))
	}

	function removeCustom(c: CustomExercise) {
		if (!confirm(`Remove "${c.name}" from the library? Routines already using it keep the name.`)) return
		onCustomChange(custom.filter((x) => x.id !== c.id))
	}

	function setNote(name: string, text: string) {
		const key = noteKey(name)
		const next = { ...notes }
		if (text.trim()) next[key] = text
		else delete next[key]
		onNotesChange(next)
	}
</script>

<!-- tall: the groups fold open and shut in place, and a panel that resized under the thumb moved
     whichever row you were reaching for. -->
<GymSheet {open} tall title={onPick ? 'Choose an exercise' : 'Exercise library'} {onClose}>
	<input
		type="search"
		value={query}
		oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)}
		placeholder="Search exercises"
		class="input input-bordered bg-white border-teal/30 w-full"
		aria-label="Search exercises"
	/>

	<!-- Add -->
	<div class="flex flex-col gap-1.5 rounded border border-teal/20 bg-white/60 p-2">
		<span class="text-xs font-semibold">New exercise</span>
		{#if error}
			<span class="text-xs text-error">{error}</span>
		{/if}
		<div class="flex gap-1.5 flex-wrap">
			<input
				type="text"
				bind:value={newName}
				placeholder={query.trim() || 'Exercise name'}
				onkeydown={(e) => {
					if (e.key === 'Enter') addCustom()
				}}
				class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 flex-1 min-w-0"
				aria-label="New exercise name"
			/>
			<select
				class="select select-xs sm:select-sm select-bordered bg-white border-teal/30 shrink-0"
				value={newGroup}
				onchange={(e) => (newGroup = (e.target as HTMLSelectElement).value)}
				aria-label="New exercise group"
			>
				{#each GROUP_NAMES as g (g)}
					<option value={g}>{g}</option>
				{/each}
				<option value="Custom">Custom</option>
			</select>
			<button
				class="btn btn-xs sm:btn-sm btn-primary shrink-0"
				onclick={addCustom}
				disabled={!newName.trim() && !query.trim()}
			>
				+ Add
			</button>
		</div>
	</div>

	<!-- Library -->
	{#if !shown.length}
		<p class="text-sm opacity-60 py-4 text-center">
			Nothing matches “{query.trim()}”. Add it above and it joins the library.
		</p>
	{/if}
	{#each shown as group (group.group)}
		{@const expanded = isOpen(group.group)}
		<div class="flex flex-col gap-1">
			<button
				class="flex items-center gap-2 text-left min-h-9 rounded hover:bg-teal/5 px-1"
				onclick={() => (openGroups[group.group] = !openGroups[group.group])}
				aria-expanded={expanded}
			>
				<span
					class="text-[10px] opacity-40 transition-transform duration-200 {expanded
						? 'rotate-90'
						: ''}"
					aria-hidden="true">▶</span
				>
				<span class="text-xs font-semibold uppercase tracking-wide opacity-50">{group.group}</span>
				<span class="text-xs opacity-40 tabular-nums ml-auto">{group.names.length}</span>
			</button>
			{#each expanded ? group.names : [] as name (name)}
				{@const key = noteKey(name)}
				{@const mine = custom.find((c) => noteKey(c.name) === key)}
				<div class="rounded border border-teal/15 bg-white/50 px-2 py-1 text-sm">
					<div class="flex items-center gap-1.5">
						{#if renamingId && mine && renamingId === mine.id}
							<input
								type="text"
								bind:value={renameText}
								onkeydown={(e) => {
									if (e.key === 'Enter') commitRename(mine)
									if (e.key === 'Escape') renamingId = null
								}}
								class="input input-xs input-bordered bg-white border-teal/30 flex-1 min-w-0"
								aria-label="Rename {name}"
							/>
							<button class="btn btn-xs btn-primary" onclick={() => commitRename(mine)}>Save</button>
						{:else if onPick}
							<!-- In picking mode the row itself is the target: a 44px "Use" button beside a name
							     you already read is a second decision you shouldn't have to make. -->
							<button
								class="flex-1 min-w-0 truncate text-left min-h-11 rounded px-1 hover:bg-teal/10"
								onclick={() => onPick(name)}>{name}</button
							>
						{:else}
							<span class="flex-1 min-w-0 truncate">{name}</span>
							{#if mine}
								<span class="badge badge-xs badge-outline shrink-0">custom</span>
							{/if}
							{#if notes[key]}
								<span class="text-xs opacity-50 shrink-0" title="Has a note">✎</span>
							{/if}
							<button
								class="btn btn-xs btn-ghost shrink-0"
								onclick={() => (openNoteKey = openNoteKey === key ? null : key)}
								aria-label="Note for {name}"
							>
								Note
							</button>
							{#if mine}
								<button
									class="btn btn-xs btn-ghost shrink-0"
									onclick={() => {
										renamingId = mine.id
										renameText = mine.name
									}}
									aria-label="Rename {name}">✎</button
								>
								<button
									class="btn btn-xs btn-ghost btn-error shrink-0"
									onclick={() => removeCustom(mine)}
									aria-label="Delete {name}">✕</button
								>
							{/if}
						{/if}
					</div>
					{#if openNoteKey === key}
						<textarea
							class="textarea textarea-xs textarea-bordered bg-white border-teal/30 w-full mt-1"
							rows="2"
							placeholder="Note for {name} — shown everywhere this lift appears"
							value={notes[key] ?? ''}
							onchange={(e) => setNote(name, (e.target as HTMLTextAreaElement).value)}
							aria-label="Note for {name}"
						></textarea>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</GymSheet>
