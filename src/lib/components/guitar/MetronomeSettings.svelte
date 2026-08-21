<script lang="ts">
	import {
		BPM_MAX,
		BPM_MIN,
		DEFAULT_TEMPO_RAMP,
		SUBDIVISIONS,
		type MetronomeParams,
		type Subdivision,
		type TempoRamp
	} from '$lib/types/guitar'

	// BPM / beats / tick / accents — the metronome controls shared by the exercise editor, the
	// run-mode live panel, and each multistep step. Operates on a plain MetronomeParams value so the
	// same UI edits an Exercise or an ExerciseStep (Timer stays in ExerciseCard).
	let {
		value,
		onUpdate,
		hideBpm = false
	}: {
		value: MetronomeParams
		onUpdate: (patch: Partial<MetronomeParams>) => void
		// Hide the BPM box (the scale view supplies its own slider + nudge buttons for tempo).
		hideBpm?: boolean
	} = $props()

	function setBpm(raw: string) {
		const n = parseInt(raw, 10)
		if (Number.isNaN(n)) return
		onUpdate({ bpm: clampBpm(n) })
	}

	function nudgeBpm(delta: number) {
		onUpdate({ bpm: clampBpm(value.bpm + delta) })
	}

	const clampBpm = (n: number) => Math.min(BPM_MAX, Math.max(BPM_MIN, n))

	// ---- Tempo ramp (opt-in) ----
	// Presence of `ramp` IS the on switch; toggling off drops it so nothing stale is stored. Seeded
	// from the current tempo so the default ramp climbs from where the user already is.
	function toggleRamp(on: boolean) {
		onUpdate({
			ramp: on
				? { ...DEFAULT_TEMPO_RAMP, endBpm: clampBpm(value.bpm + 40) }
				: undefined
		})
	}

	function setRamp(patch: Partial<TempoRamp>) {
		if (!value.ramp) return
		onUpdate({ ramp: { ...value.ramp, ...patch } })
	}

	function numOr(raw: string, fallback: number) {
		const n = parseInt(raw, 10)
		return Number.isNaN(n) ? fallback : n
	}

	function setBeats(raw: string) {
		const n = parseInt(raw, 10)
		if (Number.isNaN(n)) return
		const beats = Math.min(16, Math.max(1, n))
		// Drop accents that fall outside the new measure length.
		onUpdate({ beatsPerMeasure: beats, accentBeats: value.accentBeats.filter((b) => b < beats) })
	}

	function setSubdivision(s: Subdivision) {
		onUpdate({ subdivision: s })
	}

	function toggleAccent(beat: number) {
		const set = new Set(value.accentBeats)
		if (set.has(beat)) set.delete(beat)
		else set.add(beat)
		onUpdate({ accentBeats: [...set].sort((a, b) => a - b) })
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Tempo -->
	<div class="grid {hideBpm ? 'grid-cols-1' : 'grid-cols-2'} gap-2">
		{#if !hideBpm}
			<div class="flex flex-col gap-0.5">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60"
					>{value.ramp ? 'Start BPM' : 'BPM'}</span
				>
				<div class="flex items-center gap-1">
					<button class="btn btn-xs btn-outline px-1" onclick={() => nudgeBpm(-5)}>−5</button>
					<button class="btn btn-xs btn-outline px-1" onclick={() => nudgeBpm(-1)}>−1</button>
					<input
						type="number"
						min="20"
						max="400"
						value={value.bpm}
						onchange={(e) => setBpm((e.target as HTMLInputElement).value)}
						class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center w-14 flex-1"
					/>
					<button class="btn btn-xs btn-outline px-1" onclick={() => nudgeBpm(1)}>+1</button>
					<button class="btn btn-xs btn-outline px-1" onclick={() => nudgeBpm(5)}>+5</button>
				</div>
			</div>
		{/if}
		<label class="flex flex-col gap-0.5">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Beats</span>
			<input
				type="number"
				min="1"
				max="16"
				value={value.beatsPerMeasure}
				onchange={(e) => setBeats((e.target as HTMLInputElement).value)}
				class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center"
			/>
		</label>
	</div>

	<!-- Tick subdivision -->
	<div class="flex flex-col gap-0.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Tick</span>
		<div class="flex gap-1">
			{#each SUBDIVISIONS as opt}
				<button
					class="btn btn-xs sm:btn-sm flex-1 {value.subdivision === opt.key
						? 'btn-primary'
						: 'btn-outline'}"
					onclick={() => setSubdivision(opt.key)}>{opt.label}</button
				>
			{/each}
		</div>
	</div>

	<!-- Gradual tempo change. Hidden alongside the BPM box: the scale view maps this component's
		 patches onto its own fields and would silently drop `ramp`. -->
	{#if !hideBpm}
		<div class="flex flex-col gap-1">
			<label class="flex items-center gap-1.5 cursor-pointer w-fit">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={!!value.ramp}
					onchange={(e) => toggleRamp((e.target as HTMLInputElement).checked)}
				/>
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Gradual tempo</span>
			</label>
			{#if value.ramp}
				<div class="grid grid-cols-3 gap-2">
					<label class="flex flex-col gap-0.5">
						<span class="text-[0.65rem] uppercase tracking-wide opacity-60">To BPM</span>
						<input
							type="number"
							min={BPM_MIN}
							max={BPM_MAX}
							value={value.ramp.endBpm}
							onchange={(e) =>
								setRamp({
									endBpm: clampBpm(numOr((e.target as HTMLInputElement).value, value.ramp!.endBpm))
								})}
							class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center"
						/>
					</label>
					<label class="flex flex-col gap-0.5">
						<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Step</span>
						<input
							type="number"
							min="1"
							max="50"
							value={value.ramp.stepBpm}
							onchange={(e) =>
								setRamp({
									stepBpm: Math.min(
										50,
										Math.max(1, numOr((e.target as HTMLInputElement).value, value.ramp!.stepBpm))
									)
								})}
							class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center"
						/>
					</label>
					<label class="flex flex-col gap-0.5">
						<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Every</span>
						<input
							type="number"
							min="1"
							max="99"
							value={value.ramp.everyMeasures}
							onchange={(e) =>
								setRamp({
									everyMeasures: Math.min(
										99,
										Math.max(
											1,
											numOr((e.target as HTMLInputElement).value, value.ramp!.everyMeasures)
										)
									)
								})}
							class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 text-center"
						/>
					</label>
				</div>
				<p class="text-[0.65rem] opacity-50">
					{value.bpm} → {value.ramp.endBpm} BPM, {value.ramp.stepBpm} every {value.ramp
						.everyMeasures} measure{value.ramp.everyMeasures === 1 ? '' : 's'}.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Accent beats: tap to mark which beats are "on beat" (louder) -->
	<div class="flex flex-col gap-0.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">On-beat accents</span>
		<div class="flex flex-wrap gap-1">
			{#each Array(value.beatsPerMeasure) as _, beat}
				<button
					class="btn btn-xs btn-square {value.accentBeats.includes(beat)
						? 'btn-primary'
						: 'btn-outline'}"
					onclick={() => toggleAccent(beat)}
					aria-pressed={value.accentBeats.includes(beat)}
					aria-label={`Beat ${beat + 1} accent`}>{beat + 1}</button
				>
			{/each}
		</div>
	</div>
</div>
