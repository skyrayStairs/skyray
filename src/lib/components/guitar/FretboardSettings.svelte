<script lang="ts">
	import { type FretboardConfig, type FretView } from '$lib/types/guitar'
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
				class="select select-xs sm:select-sm select-bordered bg-white border-[#02343F]/30"
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
			<p class="text-xs opacity-50">Shows all four scales full-neck; change root & play each live while running.</p>
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
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={config.includeSevenths ?? true}
					onchange={(e) => onUpdate({ includeSevenths: (e.target as HTMLInputElement).checked })}
				/>
				7th chords
			</label>
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
					class="select select-xs sm:select-sm select-bordered bg-white border-[#02343F]/30"
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
					class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 text-center"
				/>
			</label>
		</div>
	{/if}
</div>
