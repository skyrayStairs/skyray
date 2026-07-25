<script lang="ts">
	import {
		SCALE_TYPE_LABELS,
		SEVENTH_LABELS,
		type FretboardConfig,
		type FretView,
		type ScaleType,
		type SeventhType
	} from '$lib/types/guitar'
	import { NOTE_NAMES } from '$lib/music/notes'

	let {
		config,
		onUpdate
	}: {
		config: FretboardConfig
		onUpdate: (patch: Partial<FretboardConfig>) => void
	} = $props()

	const VIEWS: { key: FretView; label: string }[] = [
		{ key: 'chord', label: 'Chord' },
		{ key: 'scale', label: 'Scale' },
		{ key: 'seventh', label: '7th' },
		{ key: 'notemap', label: 'Notes' },
		{ key: 'quiz', label: 'Quiz' }
	]

	// The 7th types currently in the quiz pool (undefined/empty config → all five).
	const ALL_SEVENTHS = SEVENTH_LABELS.map((s) => s.key)
	const quizSevenths = $derived(
		config.quizSevenths?.length ? config.quizSevenths : ALL_SEVENTHS
	)
	// Toggle one 7th type in the quiz pool, keeping at least one selected (an empty pool falls back to
	// all at runtime, which reads as "unchecked but still quizzed" — confusing — so block the last removal).
	function toggleSeventh(key: SeventhType) {
		const on = quizSevenths.includes(key)
		if (on && quizSevenths.length === 1) return // never let the pool go empty
		const next = on ? quizSevenths.filter((k) => k !== key) : [...quizSevenths, key]
		onUpdate({ quizSevenths: next })
	}

	// Which scale boards show/play (mirrors the run-phase multiselect). Undefined → all four.
	const ALL_SCALE_TYPES = SCALE_TYPE_LABELS.map((s) => s.key)
	const activeScaleTypes = $derived(config.scaleTypes ?? ALL_SCALE_TYPES)
	function toggleScaleType(t: ScaleType) {
		const set = new Set(activeScaleTypes)
		set.has(t) ? set.delete(t) : set.add(t)
		onUpdate({ scaleTypes: ALL_SCALE_TYPES.filter((k) => set.has(k)) })
	}
</script>

<div class="flex flex-col gap-2">
	<!-- View selector -->
	<div class="flex flex-col gap-0.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">View</span>
		<div class="flex flex-wrap gap-1">
			{#each VIEWS as v}
				<button
					class="btn btn-xs sm:btn-sm {config.view === v.key ? 'btn-primary' : 'btn-outline'}"
					onclick={() => onUpdate({ view: v.key })}>{v.label}</button
				>
			{/each}
		</div>
	</div>

	{#if config.view === 'chord' || config.view === 'scale'}
		<label class="flex flex-col gap-0.5 max-w-[10rem]">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Root</span>
			<select
				class="select select-xs sm:select-sm select-bordered bg-white border-teal/30"
				value={config.rootPc ?? 7}
				onchange={(e) => onUpdate({ rootPc: parseInt((e.target as HTMLSelectElement).value, 10) })}
			>
				{#each NOTE_NAMES as name, pc}
					<option value={pc}>{name}</option>
				{/each}
			</select>
		</label>

		{#if config.view === 'chord'}
			<p class="text-xs opacity-50">Shows major & minor shapes (6th-string root); change root live while running.</p>
		{:else}
			<div class="flex flex-col gap-0.5">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Scales</span>
				<div class="flex flex-wrap gap-1">
					{#each SCALE_TYPE_LABELS as s}
						<button
							class="btn btn-xs sm:btn-sm {activeScaleTypes.includes(s.key)
								? 'btn-primary'
								: 'btn-outline'}"
							aria-pressed={activeScaleTypes.includes(s.key)}
							onclick={() => toggleScaleType(s.key)}>{s.label}</button
						>
					{/each}
				</div>
			</div>
			<p class="text-xs opacity-50">Shows the selected scales full-neck; change root, scales & play each live while running.</p>
		{/if}
	{:else if config.view === 'seventh'}
		<p class="text-xs opacity-50">Movable major / minor / 7th grips for 6th & 5th-string roots — shapes only, no fret numbers (root-agnostic).</p>
	{:else if config.view === 'notemap'}
		<p class="text-xs opacity-50">Shows every natural note (C–B) on the 6th & 5th strings, frets 0–12.</p>
	{:else if config.view === 'quiz'}
		<div class="flex flex-col gap-1.5">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Include in pool</span>
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={config.includeNotes ?? true}
					onchange={(e) => onUpdate({ includeNotes: (e.target as HTMLInputElement).checked })}
				/>
				Notes (C–B / Do–Ti)
			</label>
			{#if config.includeNotes ?? true}
				<div class="flex gap-1 pl-6">
					<button
						class="btn btn-xs {(config.quizNoteNaming ?? 'letters') === 'letters'
							? 'btn-primary'
							: 'btn-outline'}"
						aria-pressed={(config.quizNoteNaming ?? 'letters') === 'letters'}
						onclick={() => onUpdate({ quizNoteNaming: 'letters' })}>C–B</button
					>
					<button
						class="btn btn-xs {config.quizNoteNaming === 'solfege'
							? 'btn-primary'
							: 'btn-outline'}"
						aria-pressed={config.quizNoteNaming === 'solfege'}
						onclick={() => onUpdate({ quizNoteNaming: 'solfege' })}>Do–Ti</button
					>
				</div>
			{/if}
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={config.includeSevenths ?? true}
					onchange={(e) => onUpdate({ includeSevenths: (e.target as HTMLInputElement).checked })}
				/>
				7th chords
			</label>
			<!-- Which 7th types to quiz — only relevant when 7th chords are in the pool. -->
			{#if config.includeSevenths ?? true}
				<div class="flex flex-wrap gap-1 pl-6">
					{#each SEVENTH_LABELS as s}
						<button
							class="btn btn-xs {quizSevenths.includes(s.key) ? 'btn-primary' : 'btn-outline'}"
							aria-pressed={quizSevenths.includes(s.key)}
							onclick={() => toggleSeventh(s.key)}>{s.label}</button
						>
					{/each}
				</div>
			{/if}
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={config.includeTriads ?? true}
					onchange={(e) => onUpdate({ includeTriads: (e.target as HTMLInputElement).checked })}
				/>
				Major / minor chords
			</label>
			<label class="flex flex-col gap-0.5 max-w-[10rem]">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Chord root string</span>
				<select
					class="select select-xs sm:select-sm select-bordered bg-white border-teal/30"
					value={String(config.quizRootString ?? 'both')}
					onchange={(e) => {
						const v = (e.target as HTMLSelectElement).value
						onUpdate({ quizRootString: v === 'both' ? 'both' : (parseInt(v, 10) as 6 | 5) })
					}}
				>
					<option value="both">Both (6th & 5th)</option>
					<option value="6">6th string</option>
					<option value="5">5th string</option>
				</select>
			</label>
			<label class="flex flex-col gap-0.5 max-w-[10rem]">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Guess time (sec)</span>
				<input
					type="number"
					min="1"
					max="60"
					value={config.guessSec ?? 5}
					onchange={(e) =>
						onUpdate({ guessSec: Math.max(1, parseInt((e.target as HTMLInputElement).value, 10) || 5) })}
					class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center"
				/>
			</label>
		</div>
	{/if}
</div>
