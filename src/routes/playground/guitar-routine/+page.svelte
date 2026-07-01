<script lang="ts">
	import { onMount } from 'svelte'
	import { makeExercise, makeRoutine, type Exercise, type Routine } from '$lib/types/guitar'
	import ExerciseCard from '$lib/components/guitar/ExerciseCard.svelte'
	import VideoLooper from '$lib/components/guitar/VideoLooper.svelte'
	import MetronomeSettings from '$lib/components/guitar/MetronomeSettings.svelte'
	import FretboardExercise from '$lib/components/guitar/FretboardExercise.svelte'
	import { Metronome, type MetronomeConfig } from '$lib/audio/metronome'
	import { beep, bell } from '$lib/audio/beep'
	import { downloadJson, readJsonFile } from '$lib/utils/fileIO'
	import { formatMmss, formatMmssMs } from '$lib/utils/time'
	import { uid } from '$lib/utils/id'
	import { gnbState } from '$lib/stores/gnb.svelte'

	const LS_ROUTINES = 'guitar-routines'
	const LS_ACTIVE = 'guitar-active-routine-id'

	let routines = $state<Routine[]>([])
	let activeId = $state<string | null>(null)
	let initialized = $state(false)
	let mode = $state<'edit' | 'run'>('edit')
	let renaming = $state(false)
	let renameText = $state('')

	const activeRoutine = $derived(routines.find((r) => r.id === activeId) ?? null)
	const exercises = $derived(activeRoutine?.exercises ?? [])

	// ---- Persistence -------------------------------------------------------
	onMount(() => {
		const savedR = localStorage.getItem(LS_ROUTINES)
		if (savedR) {
			try {
				routines = JSON.parse(savedR)
			} catch {
				routines = []
			}
		}
		const savedA = localStorage.getItem(LS_ACTIVE)
		if (savedA && routines.some((r) => r.id === savedA)) activeId = savedA
		else if (routines.length) activeId = routines[0].id
		initialized = true
		// Cleanup on unmount: kill any running audio/timer (SPA nav leaves this page mounted-then-destroyed)
		// and never leave the global nav hidden after navigating away.
		return () => {
			teardownAudio()
			gnbState.hidden = false
		}
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_ROUTINES, JSON.stringify(routines))
	})
	$effect(() => {
		if (!initialized) return
		if (activeId) localStorage.setItem(LS_ACTIVE, activeId)
	})

	// ---- Library operations ------------------------------------------------
	function updateActive(fn: (r: Routine) => Routine) {
		routines = routines.map((r) => (r.id === activeId ? fn(r) : r))
	}

	function newRoutine() {
		const r = makeRoutine(routines.length)
		routines = [...routines, r]
		activeId = r.id
	}

	function deleteRoutine() {
		if (!activeId) return
		const remaining = routines.filter((r) => r.id !== activeId)
		routines = remaining
		activeId = remaining.length ? remaining[0].id : null
	}

	function startRename() {
		if (!activeRoutine) return
		renameText = activeRoutine.name
		renaming = true
	}
	function commitRename() {
		const name = renameText.trim()
		if (name) updateActive((r) => ({ ...r, name }))
		renaming = false
	}

	// ---- Exercise operations ----------------------------------------------
	function addExercise() {
		updateActive((r) => ({ ...r, exercises: [...r.exercises, makeExercise(r.exercises.length)] }))
	}
	function updateExercise(id: string, patch: Partial<Exercise>) {
		updateActive((r) => ({
			...r,
			exercises: r.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e))
		}))
	}
	function removeExercise(id: string) {
		updateActive((r) => ({ ...r, exercises: r.exercises.filter((e) => e.id !== id) }))
	}
	// Edit the running exercise live: persist, and reconfigure the metronome on the fly if it's playing.
	function liveUpdateExercise(patch: Partial<Exercise>) {
		if (!runExercise) return
		updateExercise(runExercise.id, patch)
		if (running && metro && !runExercise.video) {
			metro.configure(cfgFor({ ...runExercise, ...patch }))
		}
	}
	function moveExercise(index: number, dir: -1 | 1) {
		const target = index + dir
		updateActive((r) => {
			if (target < 0 || target >= r.exercises.length) return r
			const next = [...r.exercises]
			;[next[index], next[target]] = [next[target], next[index]]
			return { ...r, exercises: next }
		})
	}

	// ---- File I/O ----------------------------------------------------------
	function handleSaveFile() {
		if (!activeRoutine) return
		const safeName = activeRoutine.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'routine'
		downloadJson(`${safeName}.json`, activeRoutine)
	}

	async function handleLoadFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		try {
			const parsed = (await readJsonFile(file)) as Partial<Routine>
			if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.exercises)) {
				alert('Invalid routine file.')
			} else {
				// Fresh ids so an imported routine never collides with an existing one.
				const imported: Routine = {
					id: uid(),
					name: parsed.name,
					exercises: parsed.exercises.map((ex, i) => ({ ...makeExercise(i), ...ex, id: uid() }))
				}
				routines = [...routines, imported]
				activeId = imported.id
			}
		} catch {
			alert('Invalid routine file.')
		}
		input.value = ''
	}

	// ---- Run mode / player -------------------------------------------------
	let currentIndex = $state(0)
	let running = $state(false) // counting down (vs paused)
	let remainingSec = $state(0)
	let finished = $state(false)
	let pulseBeat = $state(-1) // beat index currently sounding (visual indicator)
	let runSettingsOpen = $state(false) // live metronome editor panel in run mode
	// Timer hit 0 on a quiz/video step; we're waiting for it to reach a natural boundary before
	// advancing (req 7). While true the countdown is frozen at 0 and the child keeps playing.
	let pendingAdvance = $state(false)

	let audioCtx: AudioContext | null = null
	let metro: Metronome | null = null
	let rafId: number | null = null // drives the ms countdown display
	let segmentStart = 0 // performance.now() when the current running segment began
	let remainingAtSegmentStart = 0 // remaining seconds captured at segment start
	let lastBellSec = -1 // last whole-second the countdown bell rang at (dedupe within a second)

	// Begin a countdown segment from the current remainingSec, re-arming the last-5s bell.
	function armSegment() {
		remainingAtSegmentStart = remainingSec
		segmentStart = performance.now()
		lastBellSec = -1
	}

	const runExercise = $derived(exercises[currentIndex] ?? null)
	const nextExercise = $derived(exercises[currentIndex + 1] ?? null)
	const runProgress = $derived(
		runExercise && runExercise.durationSec > 0
			? 1 - Math.min(1, remainingSec / runExercise.durationSec)
			: 0
	)

	function cfgFor(ex: Exercise): MetronomeConfig {
		return {
			bpm: ex.bpm,
			subdivision: ex.subdivision,
			beatsPerMeasure: ex.beatsPerMeasure,
			accentBeats: ex.accentBeats,
			onTick: (beatIndex) => {
				pulseBeat = beatIndex
			}
		}
	}

	function enterRun() {
		if (!exercises.length) return
		pendingAdvance = false
		currentIndex = 0
		finished = false
		running = false
		remainingSec = exercises[0].durationSec
		lastBellSec = -1
		mode = 'run'
		gnbState.hidden = true // exercise view starts with the nav hidden; user can toggle it back
		start() // req 4: the timer starts on entering (Run click is the audio-unlocking gesture)
	}

	function ensureAudio() {
		// Must run inside a user gesture (the Start/Run click) to unlock audio.
		if (!audioCtx) {
			audioCtx = new AudioContext()
			metro = new Metronome(audioCtx, cfgFor(exercises[currentIndex]))
		}
		if (audioCtx.state === 'suspended') audioCtx.resume()
	}

	function computeRemaining(): number {
		return remainingAtSegmentStart - (performance.now() - segmentStart) / 1000
	}

	// rAF (not setInterval) so the millisecond display updates smoothly.
	function startDisplayLoop() {
		stopDisplayLoop()
		const frame = () => {
			if (!running) {
				rafId = null
				return
			}
			const rem = computeRemaining()
			if (rem <= 0) {
				remainingSec = 0
				onExerciseComplete() // advance inline (running stays true) or defer/finish (running false)
				rafId = running ? requestAnimationFrame(frame) : null
				return
			}
			remainingSec = rem
			// Ring a bell once per second through the final 5 seconds (at 5,4,3,2,1 remaining).
			const sec = Math.ceil(rem)
			if (sec <= 5 && sec !== lastBellSec) {
				lastBellSec = sec
				if (audioCtx) bell(audioCtx)
			}
			rafId = requestAnimationFrame(frame)
		}
		rafId = requestAnimationFrame(frame)
	}
	function stopDisplayLoop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId)
			rafId = null
		}
	}

	function start() {
		if (running || finished || !exercises.length) return
		ensureAudio() // unlock audio so the countdown bell can ring (even for video/fretboard)
		running = true
		armSegment()
		// Only metronome exercises tick; video/fretboard run the countdown (+bell) without clicks.
		if (ownsRoutineTimer(exercises[currentIndex])) {
			metro?.configure(cfgFor(exercises[currentIndex]))
			metro?.start()
		}
		startDisplayLoop()
	}

	function pause() {
		if (!running) return
		remainingSec = Math.max(0, computeRemaining())
		running = false
		metro?.stop()
		audioCtx?.suspend()
		pulseBeat = -1
		stopDisplayLoop()
	}

	// A metronome exercise auto-chains (its countdown flows straight into the next exercise). Video &
	// fretboard steps have no clicks, but their countdown now auto-runs the same way (req 4).
	function ownsRoutineTimer(ex: Exercise) {
		return !ex.video && !ex.fretboard
	}

	// Quiz & video-loop steps finish gracefully: at timer 0 we wait for the current card/loop to reach
	// a natural boundary (req 7) instead of cutting it off. Everything else advances instantly.
	function needsGracefulFinish(ex: Exercise) {
		return !!ex.video || (!!ex.fretboard && ex.fretboard.view === 'quiz')
	}

	// Called from inside the rAF frame when the countdown reaches 0.
	function onExerciseComplete() {
		if (needsGracefulFinish(exercises[currentIndex])) {
			pendingAdvance = true // freeze; the child keeps playing until its boundary (onChildBoundary)
			running = false // frame stops (rafId=null) since running is now false
			metro?.stop()
			return
		}
		advanceInline()
	}

	// In-frame advance: keep counting straight into the next step — no fresh display loop, so the
	// running rAF simply reschedules itself (avoids a double-speed countdown).
	function advanceInline() {
		metro?.stop()
		if (audioCtx) beep(audioCtx)
		if (currentIndex >= exercises.length - 1) {
			finishRun()
			return
		}
		currentIndex += 1
		pendingAdvance = false
		const ex = exercises[currentIndex]
		remainingSec = ex.durationSec
		armSegment()
		if (ownsRoutineTimer(ex)) {
			metro?.configure(cfgFor(ex))
			metro?.start() // running stays true → seamless into the next metronome step
		} else {
			pulseBeat = -1 // video/fretboard: countdown keeps running, just no clicks
		}
	}

	// The child quiz/video-loop reached a natural boundary while we were waiting to advance (req 7).
	// This fires outside the page rAF, so we start the next step fresh via goToExercise.
	function onChildBoundary() {
		if (!pendingAdvance) return
		pendingAdvance = false
		if (audioCtx) beep(audioCtx)
		if (currentIndex < exercises.length - 1) goToExercise(currentIndex + 1)
		else finishRun()
	}

	// Move to a fresh exercise and auto-start its timer (req 4). Used by Prev/Skip and deferred advance.
	function goToExercise(index: number) {
		pendingAdvance = false
		currentIndex = index
		finished = false
		running = false
		stopDisplayLoop()
		metro?.stop()
		pulseBeat = -1
		remainingSec = exercises[index].durationSec
		start()
	}

	function finishRun() {
		running = false
		finished = true
		pendingAdvance = false
		stopDisplayLoop()
		metro?.stop()
		audioCtx?.suspend()
		pulseBeat = -1
	}

	function resetExercise() {
		const ex = exercises[currentIndex]
		if (!ex) return
		if (pendingAdvance) {
			goToExercise(currentIndex) // was waiting to advance → restart this step from the top
			return
		}
		remainingSec = ex.durationSec
		armSegment()
		if (running && ownsRoutineTimer(ex)) {
			metro?.stop()
			metro?.configure(cfgFor(ex))
			metro?.start()
		}
	}

	function jump(dir: -1 | 1) {
		const target = currentIndex + dir
		if (target < 0 || target >= exercises.length) return
		goToExercise(target)
	}

	function teardownAudio() {
		running = false
		pendingAdvance = false
		stopDisplayLoop()
		metro?.stop()
		metro = null
		if (audioCtx) {
			audioCtx.close()
			audioCtx = null
		}
		pulseBeat = -1
	}

	function exitRun() {
		teardownAudio()
		finished = false
		mode = 'edit'
		gnbState.hidden = false // restore the nav when leaving the exercise view
	}
</script>

<div class="flex flex-col bg-[#F0EDCC] text-[#02343F] min-h-full">
	{#if mode === 'edit'}
		<!-- ===== Edit mode ===== -->
		<div
			class="sticky top-0 z-10 bg-[#F0EDCC] border-b border-[#02343F]/20 px-3 py-2 sm:px-4 shrink-0 flex flex-col gap-2"
		>
			<!-- Routine library control -->
			<div class="flex gap-1.5 items-center flex-wrap">
				<select
					class="select select-xs sm:select-sm select-bordered bg-white border-[#02343F]/30 max-w-[45%]"
					value={activeId ?? ''}
					onchange={(e) => (activeId = (e.target as HTMLSelectElement).value || null)}
					disabled={routines.length === 0}
				>
					{#if routines.length === 0}
						<option value="">No routines</option>
					{/if}
					{#each routines as r (r.id)}
						<option value={r.id}>{r.name}</option>
					{/each}
				</select>
				<button class="btn btn-xs sm:btn-sm btn-primary shrink-0" onclick={newRoutine}>+ New</button
				>
				<button
					class="btn btn-xs sm:btn-sm btn-outline shrink-0"
					onclick={startRename}
					disabled={!activeRoutine}>Rename</button
				>
				<button
					class="btn btn-xs sm:btn-sm btn-outline btn-error shrink-0"
					onclick={deleteRoutine}
					disabled={!activeRoutine}>Delete</button
				>
			</div>

			{#if renaming}
				<div class="flex gap-1.5 items-center">
					<input
						type="text"
						bind:value={renameText}
						onkeydown={(e) => {
							if (e.key === 'Enter') commitRename()
							if (e.key === 'Escape') renaming = false
						}}
						class="input input-xs sm:input-sm input-bordered flex-1 bg-white border-[#02343F]/30"
					/>
					<button class="btn btn-xs sm:btn-sm btn-primary shrink-0" onclick={commitRename}
						>Save</button
					>
					<button class="btn btn-xs sm:btn-sm btn-ghost shrink-0" onclick={() => (renaming = false)}
						>Cancel</button
					>
				</div>
			{/if}

			<!-- Action row -->
			<div class="flex gap-1.5 items-center flex-wrap">
				<label class="btn btn-xs sm:btn-sm btn-outline cursor-pointer shrink-0">
					Load file
					<input type="file" accept=".json" class="hidden" onchange={handleLoadFile} />
				</label>
				<button
					class="btn btn-xs sm:btn-sm btn-outline shrink-0"
					onclick={handleSaveFile}
					disabled={!activeRoutine}>Save file</button
				>
				<button
					class="btn btn-xs sm:btn-sm btn-primary shrink-0"
					onclick={addExercise}
					disabled={!activeRoutine}>+ Add exercise</button
				>
				<button
					class="btn btn-xs sm:btn-sm btn-primary shrink-0 ml-auto"
					onclick={enterRun}
					disabled={exercises.length === 0}>▶ Run</button
				>
			</div>
		</div>

		<!-- Exercise list -->
		{#if !activeRoutine}
			<div
				class="flex flex-col items-center justify-center py-24 opacity-40 flex-1 text-center px-6"
			>
				<p class="text-xl mb-2">No routine selected</p>
				<p class="text-sm">Tap "+ New" to create your first routine</p>
			</div>
		{:else if exercises.length === 0}
			<div
				class="flex flex-col items-center justify-center py-24 opacity-40 flex-1 text-center px-6"
			>
				<p class="text-xl mb-2">No exercises yet</p>
				<p class="text-sm">Tap "+ Add exercise" to build this routine</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2 p-2 sm:p-3 max-w-2xl w-full mx-auto">
				{#each exercises as ex, i (ex.id)}
					<ExerciseCard
						exercise={ex}
						index={i}
						canMoveUp={i > 0}
						canMoveDown={i < exercises.length - 1}
						onUpdate={(patch) => updateExercise(ex.id, patch)}
						onRemove={() => removeExercise(ex.id)}
						onMoveUp={() => moveExercise(i, -1)}
						onMoveDown={() => moveExercise(i, 1)}
					/>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- ===== Run mode ===== -->
		{#snippet countdownBar()}
			<!-- Opt-in countdown for video/fretboard steps: same machinery as the metronome timer,
				 minus the clicks. Rings the last-5s bell; on zero it advances (or finishes). -->
			<div class="flex flex-col items-center gap-2 w-full max-w-md">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-50">Exercise timer</span>
				{#if finished}
					<div class="text-3xl font-mono">Done</div>
				{:else if pendingAdvance}
					<div class="text-2xl font-mono">Finishing…</div>
				{:else}
					<div class="font-mono tabular-nums leading-none">
						<span class="text-4xl sm:text-5xl">{formatMmss(Math.floor(remainingSec))}</span><span
							class="text-xl sm:text-2xl opacity-70"
							>.{formatMmssMs(remainingSec).split('.')[1]}</span
						>
					</div>
					<div class="w-full h-2 bg-[#02343F]/15 rounded-full overflow-hidden">
						<div
							class="h-full bg-[#02343F] transition-[width] duration-100"
							style="width: {runProgress * 100}%"
						></div>
					</div>
				{/if}
				<div class="flex gap-2">
					{#if finished}
						<button class="btn btn-sm btn-primary" onclick={enterRun}>↻ Restart</button>
					{:else if pendingAdvance}
						<button class="btn btn-sm btn-primary" disabled>⏳ Finishing…</button>
					{:else if running}
						<button class="btn btn-sm btn-primary" onclick={pause}>⏸ Pause</button>
					{:else}
						<button class="btn btn-sm btn-primary" onclick={start}>▶ Start</button>
					{/if}
					<button class="btn btn-sm btn-outline" onclick={resetExercise} disabled={finished}
						>↺ Reset</button
					>
				</div>
			</div>
		{/snippet}
		<div
			class="flex flex-col items-center justify-center flex-1 px-6 py-8 gap-6 text-center min-h-full"
		>
			<button
				class="btn btn-xs btn-ghost self-end"
				onclick={() => (gnbState.hidden = !gnbState.hidden)}
				aria-pressed={gnbState.hidden}>{gnbState.hidden ? '▼ Show nav' : '▲ Hide nav'}</button
			>

			<div class="text-sm opacity-60">
				Exercise {currentIndex + 1} / {exercises.length}
			</div>

			<h2 class="text-2xl sm:text-3xl font-bold" style="font-family: KNUTRUTHTTF">
				{runExercise?.name}
			</h2>

			{#if runExercise?.video}
				<!-- Video/audio loop exercise: own opt-in countdown (no metronome chain auto-advance) -->
				{#key runExercise.id}
					<div class="w-full max-w-2xl text-left">
						<VideoLooper
							video={runExercise.video}
							mode="run"
							finishing={pendingAdvance}
							onFinished={onChildBoundary}
							onChange={(v) => runExercise && updateExercise(runExercise.id, { video: v })}
						/>
					</div>
				{/key}

				{@render countdownBar()}

				<div class="flex gap-2 flex-wrap justify-center mt-2">
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(-1)}
						disabled={currentIndex === 0}>⏮ Prev</button
					>
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(1)}
						disabled={currentIndex >= exercises.length - 1}>Skip ⏭</button
					>
					<button class="btn btn-sm btn-ghost" onclick={exitRun}>✕ Exit</button>
				</div>
			{:else if runExercise?.fretboard}
				<!-- Fretboard exercise (diagram or quiz): own opt-in countdown, no metronome -->
				{#key runExercise.id}
					<div class="w-full max-w-2xl">
						<FretboardExercise
							config={runExercise.fretboard}
							finishing={pendingAdvance}
							onFinished={onChildBoundary}
							onChange={(v) => runExercise && updateExercise(runExercise.id, { fretboard: v })}
						/>
					</div>
				{/key}

				{@render countdownBar()}

				<div class="flex gap-2 flex-wrap justify-center mt-2">
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(-1)}
						disabled={currentIndex === 0}>⏮ Prev</button
					>
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(1)}
						disabled={currentIndex >= exercises.length - 1}>Skip ⏭</button
					>
					<button class="btn btn-sm btn-ghost" onclick={exitRun}>✕ Exit</button>
				</div>
			{:else}
				{#if finished}
					<div class="text-5xl sm:text-7xl font-mono">Done</div>
				{:else}
					<div class="font-mono tabular-nums leading-none">
						<span class="text-6xl sm:text-8xl">{formatMmss(Math.floor(remainingSec))}</span><span
							class="text-3xl sm:text-5xl opacity-70"
							>.{formatMmssMs(remainingSec).split('.')[1]}</span
						>
					</div>
				{/if}

				<!-- Progress bar -->
				<div class="w-full max-w-md h-2 bg-[#02343F]/15 rounded-full overflow-hidden">
					<div
						class="h-full bg-[#02343F] transition-[width] duration-100"
						style="width: {runProgress * 100}%"
					></div>
				</div>

				<!-- Tempo + beat indicator -->
				{#if runExercise}
					<div class="flex flex-col items-center gap-2">
						<div class="text-sm opacity-60">
							{runExercise.bpm} BPM · {runExercise.subdivision === 'quarter'
								? '1/4'
								: runExercise.subdivision === 'eighth'
									? '1/8'
									: '1/16'} ticks
						</div>
						<div class="flex gap-1.5">
							{#each Array(runExercise.beatsPerMeasure) as _, beat}
								<div
									class="w-4 h-4 rounded-full border-2 border-[#02343F] transition-all duration-75
										{pulseBeat === beat ? 'bg-[#02343F] scale-125' : 'bg-transparent'}
										{runExercise.accentBeats.includes(beat) ? 'border-[#02343F]' : 'border-[#02343F]/30'}"
								></div>
							{/each}
						</div>
					</div>
				{/if}

				{#if nextExercise && !finished}
					<div class="text-sm opacity-50">
						Next: {nextExercise.name} ({formatMmss(nextExercise.durationSec)})
					</div>
				{:else if !finished}
					<div class="text-sm opacity-50">Last exercise</div>
				{/if}

				<!-- Controls -->
				<div class="flex gap-2 flex-wrap justify-center mt-2">
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(-1)}
						disabled={currentIndex === 0}>⏮ Prev</button
					>
					{#if finished}
						<button class="btn btn-sm btn-primary" onclick={enterRun}>↻ Restart</button>
					{:else if running}
						<button class="btn btn-sm btn-primary" onclick={pause}>⏸ Pause</button>
					{:else}
						<button class="btn btn-sm btn-primary" onclick={start}>▶ Start</button>
					{/if}
					<button class="btn btn-sm btn-outline" onclick={resetExercise} disabled={finished}
						>↺ Reset</button
					>
					<button
						class="btn btn-sm btn-outline"
						onclick={() => jump(1)}
						disabled={currentIndex >= exercises.length - 1}>Skip ⏭</button
					>
					<button class="btn btn-sm btn-ghost" onclick={exitRun}>✕ Exit</button>
				</div>

				<!-- Live metronome editor (changes apply on the fly) -->
				{#if runExercise}
					<div class="w-full max-w-md">
						<button
							class="btn btn-xs btn-ghost"
							onclick={() => (runSettingsOpen = !runSettingsOpen)}
							>{runSettingsOpen ? '▲ Hide settings' : '⚙ Settings'}</button
						>
						{#if runSettingsOpen}
							<div class="mt-2 text-left rounded border border-[#02343F]/20 bg-white/60 p-2">
								<MetronomeSettings exercise={runExercise} onUpdate={liveUpdateExercise} />
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
