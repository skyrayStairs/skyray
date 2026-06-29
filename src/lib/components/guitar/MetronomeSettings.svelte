<script lang="ts">
	import { SUBDIVISIONS, type Exercise, type Subdivision } from '$lib/types/guitar'

	// BPM / beats / tick / accents — the metronome controls shared by the exercise editor and the
	// run-mode live panel (Timer stays in ExerciseCard; it has non-reactive mirror state that must
	// not be reused against the changing run-mode exercise).
	let {
		exercise,
		onUpdate
	}: {
		exercise: Exercise
		onUpdate: (patch: Partial<Exercise>) => void
	} = $props()

	function setBpm(raw: string) {
		const n = parseInt(raw, 10)
		if (Number.isNaN(n)) return
		onUpdate({ bpm: Math.min(400, Math.max(20, n)) })
	}

	function setBeats(raw: string) {
		const n = parseInt(raw, 10)
		if (Number.isNaN(n)) return
		const beats = Math.min(16, Math.max(1, n))
		// Drop accents that fall outside the new measure length.
		onUpdate({ beatsPerMeasure: beats, accentBeats: exercise.accentBeats.filter((b) => b < beats) })
	}

	function setSubdivision(s: Subdivision) {
		onUpdate({ subdivision: s })
	}

	function toggleAccent(beat: number) {
		const set = new Set(exercise.accentBeats)
		if (set.has(beat)) set.delete(beat)
		else set.add(beat)
		onUpdate({ accentBeats: [...set].sort((a, b) => a - b) })
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Tempo -->
	<div class="grid grid-cols-2 gap-2">
		<label class="flex flex-col gap-0.5">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">BPM</span>
			<input
				type="number"
				min="20"
				max="400"
				value={exercise.bpm}
				onchange={(e) => setBpm((e.target as HTMLInputElement).value)}
				class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 text-center"
			/>
		</label>
		<label class="flex flex-col gap-0.5">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Beats</span>
			<input
				type="number"
				min="1"
				max="16"
				value={exercise.beatsPerMeasure}
				onchange={(e) => setBeats((e.target as HTMLInputElement).value)}
				class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 text-center"
			/>
		</label>
	</div>

	<!-- Tick subdivision -->
	<div class="flex flex-col gap-0.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Tick</span>
		<div class="flex gap-1">
			{#each SUBDIVISIONS as opt}
				<button
					class="btn btn-xs sm:btn-sm flex-1 {exercise.subdivision === opt.key
						? 'btn-primary'
						: 'btn-outline'}"
					onclick={() => setSubdivision(opt.key)}>{opt.label}</button
				>
			{/each}
		</div>
	</div>

	<!-- Accent beats: tap to mark which beats are "on beat" (louder) -->
	<div class="flex flex-col gap-0.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">On-beat accents</span>
		<div class="flex flex-wrap gap-1">
			{#each Array(exercise.beatsPerMeasure) as _, beat}
				<button
					class="btn btn-xs btn-square {exercise.accentBeats.includes(beat)
						? 'btn-primary'
						: 'btn-outline'}"
					onclick={() => toggleAccent(beat)}
					aria-pressed={exercise.accentBeats.includes(beat)}
					aria-label={`Beat ${beat + 1} accent`}>{beat + 1}</button
				>
			{/each}
		</div>
	</div>
</div>
