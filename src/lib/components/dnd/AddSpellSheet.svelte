<script lang="ts">
	import { fly, fade } from 'svelte/transition'
	import type { SpellEntry } from '$lib/types/spell'
	import { SPELLS, bucketCastingTime, bucketRange, bucketDuration } from '$lib/utils/spellParser'

	let {
		open = $bindable(false),
		currentSetNames,
		onAdd,
		onRemove
	}: {
		open: boolean
		currentSetNames: Set<string>
		onAdd: (spell: SpellEntry) => void
		onRemove: (name: string) => void
	} = $props()

	let searchQuery = $state('')
	let filterLevels = $state<Set<number>>(new Set())
	let filterSchools = $state<Set<string>>(new Set())
	let filterEffectTypes = $state<Set<string>>(new Set())
	let filterCastingTimes = $state<Set<string>>(new Set())
	let filterRanges = $state<Set<string>>(new Set())
	let filterDurations = $state<Set<string>>(new Set())
	let filterClasses = $state<Set<string>>(new Set())

	const ALL_SCHOOLS = [...new Set(SPELLS.map((s) => s.school))].sort()
	const ALL_EFFECT_TYPES = [...new Set(SPELLS.flatMap((s) => s.effectTypes))].sort()
	const ALL_CLASSES = [...new Set(SPELLS.flatMap((s) => s.classes))].sort()
	const CASTING_TIME_BUCKETS = ['action', 'bonus action', 'reaction', '1 minute', 'longer']
	const RANGE_BUCKETS = ['Self', 'Touch', '0-30ft', '31-100ft', '100+ft', 'Other']
	const DURATION_BUCKETS = ['Instantaneous', '1 round', 'up to 1 min', 'up to 10 min', 'longer']

	function toggleSet<T>(set: Set<T>, val: T): Set<T> {
		const next = new Set(set)
		next.has(val) ? next.delete(val) : next.add(val)
		return next
	}

	const filteredSpells = $derived.by(() => {
		const q = searchQuery.toLowerCase()
		return SPELLS.filter((spell) => {
			if (q && !spell.name.toLowerCase().includes(q)) return false
			if (filterLevels.size > 0 && !filterLevels.has(spell.level)) return false
			if (filterSchools.size > 0 && !filterSchools.has(spell.school)) return false
			if (filterEffectTypes.size > 0 && !spell.effectTypes.some((t) => filterEffectTypes.has(t))) return false
			if (filterCastingTimes.size > 0 && !filterCastingTimes.has(bucketCastingTime(spell.castingTime))) return false
			if (filterRanges.size > 0 && !filterRanges.has(bucketRange(spell.range))) return false
			if (filterDurations.size > 0 && !filterDurations.has(bucketDuration(spell.duration))) return false
			if (filterClasses.size > 0 && !spell.classes.some((c) => filterClasses.has(c))) return false
			return true
		})
	})

	// Spells in the current filtered view not yet in the set.
	const addableCount = $derived(filteredSpells.filter((s) => !currentSetNames.has(s.name)).length)

	function addAll() {
		// onAdd (parent) dedupes against the set, so adding the whole filtered list is safe.
		for (const spell of filteredSpells) onAdd(spell)
	}

	function resetFilters() {
		searchQuery = ''
		filterLevels = new Set()
		filterSchools = new Set()
		filterEffectTypes = new Set()
		filterCastingTimes = new Set()
		filterRanges = new Set()
		filterDurations = new Set()
		filterClasses = new Set()
	}

	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
			return () => {
				document.body.style.overflow = ''
			}
		}
	})
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') open = false }} />

{#if open}
	<button
		class="fixed inset-0 bg-black/50 z-40 cursor-default border-none outline-none"
		transition:fade={{ duration: 150 }}
		onclick={() => (open = false)}
		aria-label="Close spell picker"
	></button>

	<div
		class="fixed bottom-0 left-0 right-0 h-[80vh] bg-base-100 rounded-t-2xl z-50 flex flex-col shadow-2xl"
		transition:fly={{ y: 500, duration: 300 }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-label="Add spell"
		tabindex="-1"
	>
		<!-- Handle -->
		<div class="flex justify-center pt-2 pb-1 flex-shrink-0">
			<div class="w-10 h-1 bg-gray-300 rounded-full"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center gap-2 px-4 pb-2 border-b flex-shrink-0">
			<input
				type="text"
				placeholder="Search spells..."
				bind:value={searchQuery}
				class="input input-sm input-bordered flex-1"
			/>
			<button class="btn btn-sm btn-ghost" onclick={resetFilters}>Reset</button>
			<button class="btn btn-sm" onclick={() => (open = false)}>Close</button>
		</div>

		<div class="flex flex-1 overflow-hidden">
			<!-- Filters sidebar -->
			<div class="w-44 overflow-y-auto p-2 border-r flex-shrink-0 text-sm">
				<!-- Level -->
				<details open>
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Level</summary>
					{#each [{ label: 'Cantrip', val: 0 }, ...Array.from({ length: 9 }, (_, i) => ({ label: String(i + 1), val: i + 1 }))] as lvl}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterLevels.has(lvl.val)}
								onchange={() => (filterLevels = toggleSet(filterLevels, lvl.val))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs">{lvl.label}</span>
						</label>
					{/each}
				</details>

				<!-- School -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">School</summary>
					{#each ALL_SCHOOLS as school}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterSchools.has(school)}
								onchange={() => (filterSchools = toggleSet(filterSchools, school))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs capitalize">{school}</span>
						</label>
					{/each}
				</details>

				<!-- Effect Type -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Effect Type</summary>
					{#each ALL_EFFECT_TYPES as et}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterEffectTypes.has(et)}
								onchange={() => (filterEffectTypes = toggleSet(filterEffectTypes, et))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs">{et}</span>
						</label>
					{/each}
				</details>

				<!-- Casting Time -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Casting Time</summary>
					{#each CASTING_TIME_BUCKETS as bucket}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterCastingTimes.has(bucket)}
								onchange={() => (filterCastingTimes = toggleSet(filterCastingTimes, bucket))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs capitalize">{bucket}</span>
						</label>
					{/each}
				</details>

				<!-- Range -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Range</summary>
					{#each RANGE_BUCKETS as bucket}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterRanges.has(bucket)}
								onchange={() => (filterRanges = toggleSet(filterRanges, bucket))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs">{bucket}</span>
						</label>
					{/each}
				</details>

				<!-- Duration -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Duration</summary>
					{#each DURATION_BUCKETS as bucket}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterDurations.has(bucket)}
								onchange={() => (filterDurations = toggleSet(filterDurations, bucket))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs">{bucket}</span>
						</label>
					{/each}
				</details>

				<!-- Classes -->
				<details class="mt-1">
					<summary class="font-semibold text-xs uppercase tracking-wide cursor-pointer py-1">Class</summary>
					{#each ALL_CLASSES as cls}
						<label class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-base-200 rounded px-1">
							<input
								type="checkbox"
								checked={filterClasses.has(cls)}
								onchange={() => (filterClasses = toggleSet(filterClasses, cls))}
								class="checkbox checkbox-xs"
							/>
							<span class="text-xs">{cls}</span>
						</label>
					{/each}
				</details>
			</div>

			<!-- Results list -->
			<div class="flex-1 overflow-y-auto">
				<div class="px-3 py-1.5 border-b sticky top-0 bg-base-100 z-10 flex items-center justify-between gap-2">
					<span class="text-xs text-gray-500">
						{filteredSpells.length} spell{filteredSpells.length !== 1 ? 's' : ''}
						{#if filterLevels.size + filterSchools.size + filterEffectTypes.size + filterCastingTimes.size + filterRanges.size + filterDurations.size + filterClasses.size > 0}
							<span class="text-primary ml-1">(filtered)</span>
						{/if}
					</span>
					<button
						class="btn btn-xs btn-primary flex-shrink-0"
						onclick={addAll}
						disabled={addableCount === 0}
					>+ Add all{addableCount > 0 ? ` (${addableCount})` : ''}</button>
				</div>
				{#each filteredSpells as spell (spell.name)}
					<button
						class="w-full text-left px-3 py-2 hover:bg-base-200 border-b flex items-center justify-between gap-2"
						onclick={() => {
							if (currentSetNames.has(spell.name)) onRemove(spell.name)
							else onAdd(spell)
						}}
					>
						<span class="flex-1 min-w-0">
							<span class="font-medium text-sm block truncate">{spell.name}</span>
							<span class="text-xs text-gray-500">
								{spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
								· <span class="capitalize">{spell.school}</span>
								{spell.ritual ? ' · Ritual' : ''}
								{spell.concentration ? ' · Conc.' : ''}
							</span>
						</span>
						{#if currentSetNames.has(spell.name)}
							<span class="text-success text-base flex-shrink-0" aria-label="In set">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
