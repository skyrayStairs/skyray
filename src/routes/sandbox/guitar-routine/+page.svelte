<script lang="ts">
	import { onMount, tick } from 'svelte'
	import {
		DEFAULT_LOOP_SEC,
		exerciseKind,
		loopReps,
		makeExercise,
		makeRoutine,
		moveExerciseToRoutine,
		sectionsTotalSec,
		stepMetronome,
		type Exercise,
		type ExerciseStep,
		type LoopSizing,
		type Routine,
		type TempoRamp
	} from '$lib/types/guitar'
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

	// Bring one exercise up to the current shape. Runs on BOTH load paths (localStorage + file import):
	//  - infer `kind` for legacy routines that predate the field, and
	//  - fold a legacy exercise-wide multistep click (metronomeEnabled) into each step's own metronome,
	//    so the old single-tempo behavior survives the move to per-step metronomes.
	function migrateExercise(ex: Exercise): Exercise {
		const kind = exerciseKind(ex)
		if (kind !== 'multistep' || !ex.steps) return { ...ex, kind }
		const exMetro = ex.metronomeEnabled === true
		const steps = ex.steps.map((s) =>
			s.metronomeEnabled !== undefined
				? s // already per-step aware — leave it
				: exMetro
					? {
							...s,
							metronomeEnabled: true,
							bpm: ex.bpm,
							subdivision: ex.subdivision,
							beatsPerMeasure: ex.beatsPerMeasure,
							accentBeats: ex.accentBeats
						}
					: { ...s, metronomeEnabled: false }
		)
		return { ...ex, kind, steps }
	}

	function migrateRoutines(list: Routine[]): Routine[] {
		return list.map((r) => ({
			...r,
			exercises: (r.exercises ?? []).map(migrateExercise)
		}))
	}

	// ---- Persistence -------------------------------------------------------
	onMount(() => {
		const savedR = localStorage.getItem(LS_ROUTINES)
		if (savedR) {
			try {
				routines = migrateRoutines(JSON.parse(savedR))
			} catch {
				routines = []
			}
		}
		const savedA = localStorage.getItem(LS_ACTIVE)
		if (savedA && routines.some((r) => r.id === savedA)) activeId = savedA
		else if (routines.length) activeId = routines[0].id
		initialized = true
		// Track the scroll position of the app's scroll container (#slot, the overflow-y:auto element in
		// the layout) so the floating jump button knows which direction to send it.
		slotEl = document.getElementById('slot')
		slotEl?.addEventListener('scroll', updateScrollState, { passive: true })
		updateScrollState()
		// Cleanup on unmount: kill any running audio/timer (SPA nav leaves this page mounted-then-destroyed)
		// and never leave the global nav hidden after navigating away.
		return () => {
			teardownAudio()
			slotEl?.removeEventListener('scroll', updateScrollState)
			gnbState.hidden = false
		}
	})

	// ---- Floating scroll-to-top/bottom button (edit mode) ------------------
	let slotEl: HTMLElement | null = null
	let scrollAtTop = $state(true)
	let slotScrollable = $state(false)

	function updateScrollState() {
		if (!slotEl) return
		scrollAtTop = slotEl.scrollTop < 40
		slotScrollable = slotEl.scrollHeight - slotEl.clientHeight > 40
	}
	function scrollToEdge() {
		if (!slotEl) return
		slotEl.scrollTo({ top: scrollAtTop ? slotEl.scrollHeight : 0, behavior: 'smooth' })
	}
	// The list height changes as exercises are added/removed and when switching edit/run — recompute
	// scrollability after each such DOM update ($effect runs post-render).
	$effect(() => {
		void exercises.length
		void mode
		updateScrollState()
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
	async function addExercise() {
		updateActive((r) => ({ ...r, exercises: [...r.exercises, makeExercise(r.exercises.length)] }))
		// Bring the new card into view so it can be edited without scrolling to the bottom by hand.
		// 'center' rather than 'start': the toolbar above the list is sticky and would cover its header.
		await tick()
		const cards = document.querySelectorAll('[data-exercise-card]')
		cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}
	// Hand this exercise to another routine (null = a new one). The current routine stays selected,
	// so the card simply leaves the list.
	function moveToRoutine(exerciseId: string, toRoutineId: string | null) {
		if (!activeId) return
		routines = moveExerciseToRoutine(routines, activeId, exerciseId, toRoutineId)
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
		// Read the pre-patch ramp BEFORE updating: runExercise is a $derived that recomputes on read,
		// so afterwards it already reports the new one (same race liveUpdateStep documents).
		const hadRamp = !!runExercise.ramp
		updateExercise(runExercise.id, patch)
		if (running && metro && !runExercise.video) {
			// Switching a ramp ON mid-run starts its climb from here — not from however many measures
			// have already gone by, which would jump straight to the target. Editing an existing
			// ramp's numbers deliberately does NOT rewind it.
			if (patch.ramp && !hadRamp) metro.resetRamp()
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

	// ---- Drag-to-reorder (edit mode) — complements the up/down arrows -------
	let dragIndex = $state<number | null>(null)
	let dragOverIndex = $state<number | null>(null)

	function reorderExercise(from: number, to: number) {
		if (from === to) return
		updateActive((r) => {
			if (from < 0 || from >= r.exercises.length || to < 0 || to >= r.exercises.length) return r
			const next = [...r.exercises]
			const [moved] = next.splice(from, 1)
			next.splice(to, 0, moved) // drop lands the card at the hovered slot
			return { ...r, exercises: next }
		})
	}

	function onExerciseDragStart(e: DragEvent, i: number) {
		dragIndex = i
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', String(i))
			// Drag the whole card, not just the grab handle, as the ghost image.
			const card = (e.currentTarget as HTMLElement).closest('[data-exercise-card]')
			if (card) e.dataTransfer.setDragImage(card, 24, 24)
		}
	}
	function onExerciseDragOver(e: DragEvent, i: number) {
		if (dragIndex === null) return
		e.preventDefault() // allow drop
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
		dragOverIndex = i
	}
	function onExerciseDrop(e: DragEvent, i: number) {
		e.preventDefault()
		if (dragIndex !== null) reorderExercise(dragIndex, i)
		dragIndex = null
		dragOverIndex = null
	}
	function onExerciseDragEnd() {
		dragIndex = null
		dragOverIndex = null
	}

	// ---- File I/O ----------------------------------------------------------
	function handleSaveFile() {
		if (!activeRoutine) return
		const safeName = activeRoutine.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'routine'
		downloadJson(`${safeName}.json`, activeRoutine)
	}

	let loadError = $state('')

	async function handleLoadFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		loadError = ''
		try {
			const parsed = (await readJsonFile(file)) as Partial<Routine>
			if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.exercises)) {
				loadError = 'Invalid routine file.'
			} else {
				// Fresh ids so an imported routine never collides with an existing one.
				const imported: Routine = {
					id: uid(),
					name: parsed.name,
					exercises: parsed.exercises.map((ex, i) =>
						migrateExercise({ ...makeExercise(i), ...ex, id: uid() })
					)
				}
				routines = [...routines, imported]
				activeId = imported.id
			}
		} catch {
			loadError = 'Invalid routine file.'
		}
		input.value = ''
	}

	// ---- Run mode / player -------------------------------------------------
	let currentIndex = $state(0)
	// Multistep sub-state: which step of the current exercise, its 0-based repeat, and whether we're
	// currently counting down the rest gap before the next step. Reset whenever a new exercise is armed.
	let stepIndex = $state(0)
	let stepRepeat = $state(0)
	let resting = $state(false)
	// What the current rest gap leads into: another repeat of this step, or the next step. Null when
	// not resting. Lets a single `resting` countdown serve both between-reps and between-steps rests.
	let restTarget = $state<'rep' | 'step' | null>(null)

	// Metronome sections: which timed section of the current exercise is playing. The click never
	// stops at a section boundary — only the label and the countdown change.
	let sectionIndex = $state(0)

	// ---- Video timed-loop sequence (kind === 'video' with timedLoops) ----
	// The loop timer drives `remainingSec`; these track position in the loop list.
	let loopIndex = $state(0)
	let loopRepeat = $state(0)
	// Bumped every time the page wants VideoLooper to (re)start the current loop from A (switch or repeat).
	let loopCmdNonce = $state(0)
	// Loops finished but the exercise cap is still running → hold on the last loop until the cap expires.
	let holdingForCap = $state(false)
	// A 'timer'-sized loop's countdown hit 0 mid-pass → wait for the current A→B loop to finish before
	// switching (graceful, like the cap finish). Freezes the loop clock at 0 until the next wrap (req 7).
	let awaitingLoopBoundary = $state(false)
	// Second clock: the optional exercise cap that runs ALONGSIDE the loop timer and, on expiry, advances
	// to the next exercise even mid-sequence. Only active for a timed-loop video with the timer opted in.
	let capActive = $state(false)
	let capRemaining = $state(0)
	let capRemainingAtStart = 0 // capRemaining captured when the current running segment began
	let capSegStart = 0 // performance.now() when the current running segment began (cap clock)
	let running = $state(false) // counting down (vs paused)
	let remainingSec = $state(0)
	let finished = $state(false)
	let pulseBeat = $state(-1) // beat index currently sounding (visual indicator)
	let runSettingsOpen = $state(true) // live metronome editor panel in run mode (open by default)
	let liveBpm = $state(0) // tempo of the last tick — the ramped value while a TempoRamp is climbing
	let expandedStepId = $state<string | null>(null) // which run-mode step row is expanded (req 2)
	// Timer hit 0 on a quiz/video step; we're waiting for it to reach a natural boundary before
	// advancing (req 7). While true the countdown is frozen at 0 and the child keeps playing.
	let pendingAdvance = $state(false)

	let audioCtx = $state<AudioContext | null>(null) // $state so the quiz reveal-bell prop stays reactive
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
	// The step currently playing in a multistep exercise (null for other kinds).
	const runStep = $derived(
		isMultistep(runExercise) ? (runExercise!.steps![stepIndex] ?? null) : null
	)
	// The current step's resolved metronome params — drives the run-mode beat indicator + live editor.
	const runStepMetro = $derived(runStep ? stepMetronome(runStep) : null)
	// The loop currently playing in a timed-loop video exercise (null for other kinds), + its id for the
	// VideoLooper command prop.
	const runLoop = $derived(
		isVideoSequence(runExercise) ? (runExercise!.video!.loops[loopIndex] ?? null) : null
	)
	const runLoopId = $derived(runLoop?.id ?? null)
	// What plays next WITHIN a multistep exercise: another repeat, or the next step. Null when the current
	// step is the last one on its final repeat (the "next" is then the next exercise). Mirrors onStepComplete.
	const runNextStepLabel = $derived.by(() => {
		if (!isMultistep(runExercise) || !runStep) return null
		const steps = runExercise!.steps!
		if (stepRepeat + 1 < runStep.repeatCount)
			return `Rep ${stepRepeat + 2} / ${runStep.repeatCount}`
		if (stepIndex + 1 < steps.length) {
			const desc = steps[stepIndex + 1].description?.trim()
			return `Step ${stepIndex + 2}${desc ? ` — ${desc}` : ''}`
		}
		return null
	})
	// Denominator for the progress bar: the current step (or rest) for multistep, else the exercise timer.
	const currentSegmentDuration = $derived.by(() => {
		if (!runExercise) return 0
		if (isMultistep(runExercise))
			return resting ? (runStep?.restSec ?? 0) : (runStep?.durationSec ?? 0)
		if (hasSections(runExercise)) return runExercise.sections![sectionIndex]?.durationSec ?? 0
		// Only 'timer'-sized loops have a countdown segment; 'reps' progress is loopRepeat/reps (see below).
		if (isVideoSequence(runExercise))
			return loopSizing(runExercise) === 'timer' && runLoop ? loopDurOf(runLoop) : 0
		return runExercise.durationSec
	})
	// Is the current video sequence sized by reps (vs a loop timer)? Drives the run-mode readout.
	const runsReps = $derived(isVideoSequence(runExercise) && loopSizing(runExercise) === 'reps')
	// Reps completed / target for the current 'reps'-sized loop (drives its progress bar + "Rep k/N").
	const runLoopReps = $derived(runLoop ? loopReps(runLoop) : 1)
	const runProgress = $derived.by(() => {
		if (!runExercise || !runsCountdown(runExercise)) return 0
		if (isVideoSequence(runExercise) && loopSizing(runExercise) === 'reps')
			return Math.min(1, loopRepeat / runLoopReps)
		return currentSegmentDuration > 0 ? 1 - Math.min(1, remainingSec / currentSegmentDuration) : 0
	})

	function cfgFor(ex: Exercise): MetronomeConfig {
		return {
			bpm: ex.bpm,
			subdivision: ex.subdivision,
			beatsPerMeasure: ex.beatsPerMeasure,
			accentBeats: ex.accentBeats,
			ramp: ex.ramp,
			onTick: (beatIndex) => {
				pulseBeat = beatIndex
				liveBpm = metro?.bpm ?? ex.bpm
			}
		}
	}

	// Metronome config for one multistep step (resolves defaults for legacy steps).
	function stepCfg(step: ExerciseStep): MetronomeConfig {
		const params = stepMetronome(step)
		return {
			...params,
			onTick: (beatIndex) => {
				pulseBeat = beatIndex
				liveBpm = metro?.bpm ?? params.bpm
			}
		}
	}

	function enterRun(startIndex = 0) {
		if (!exercises.length) return
		const idx = Math.min(Math.max(0, startIndex), exercises.length - 1)
		pendingAdvance = false
		currentIndex = idx
		finished = false
		running = false
		armExercise(exercises[idx])
		lastBellSec = -1
		mode = 'run'
		gnbState.hidden = true // exercise view starts with the nav hidden; user can toggle it back
		start() // req 4: the timer starts on entering (Run click is the audio-unlocking gesture)
	}

	// Tempo readout. With a ramp on, the stored bpm is only the START — show where the click actually
	// is (liveBpm, fed by onTick) and where it's heading.
	function bpmLabel(p: { bpm: number; ramp?: TempoRamp } | null): string {
		if (!p) return ''
		const cur = p.ramp && liveBpm ? liveBpm : p.bpm
		return p.ramp ? `${cur} → ${p.ramp.endBpm} BPM` : `${cur} BPM`
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
			const cur = exercises[currentIndex]
			// Second clock: the exercise cap on a timed-loop video, running alongside the loop timer.
			// Expiry advances the exercise (gracefully) even mid-sequence.
			if (capActive && !pendingAdvance) {
				capRemaining = Math.max(0, computeCap())
				// While holding on the last loop, the loop timer is frozen — ring the cap's last-5s bell here.
				if (holdingForCap) {
					const csec = Math.ceil(capRemaining)
					if (csec <= 5 && csec !== lastBellSec) {
						lastBellSec = csec
						if (audioCtx) bell(audioCtx)
					}
				}
				if (capRemaining <= 0) {
					onExerciseComplete() // video → graceful finish (pendingAdvance) → onChildBoundary advances
					rafId =
						running && runsCountdown(exercises[currentIndex]) ? requestAnimationFrame(frame) : null
					return
				}
			}
			// Primary clock: step / loop / exercise countdown. Frozen while holding for the cap, and absent for
			// a 'reps'-sized video sequence (it advances on A→B boundaries via onLoopBoundary, not a timer).
			if (!holdingForCap && !awaitingLoopBoundary && hasPrimaryClock(cur)) {
				const rem = computeRemaining()
				if (rem <= 0) {
					remainingSec = 0
					// Multistep advances step→step; 'timer'-sized video loop→loop; others exercise→exercise.
					if (isMultistep(cur)) onStepComplete()
					else if (isVideoSequence(cur)) onLoopComplete()
					else if (hasSections(cur)) onSectionComplete()
					else onExerciseComplete() // inline advance (running stays true) or defer/finish
					// Keep the loop alive only while still counting down. (Read the raw array, not runExercise:
					// currentIndex was just mutated synchronously.)
					rafId =
						running && runsCountdown(exercises[currentIndex]) ? requestAnimationFrame(frame) : null
					return
				}
				remainingSec = rem
				// Ring a bell once per second through the final 5 seconds. Rests ring too, at a lower pitch,
				// as a "get ready for the next rep/exercise" cue distinct from the step-timer countdown.
				const sec = Math.ceil(rem)
				if (sec <= 5 && sec !== lastBellSec) {
					lastBellSec = sec
					if (audioCtx) bell(audioCtx, resting ? { freq: 587 } : {})
				}
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
		if (capActive) {
			capSegStart = performance.now() // start the parallel cap clock for this running segment
			capRemainingAtStart = capRemaining
		}
		// Metronome kind: one continuous click. Multistep: the current step's click (if it opted in).
		// Video / fretboard: countdown (+bell) without clicks.
		const cur = exercises[currentIndex]
		if (isMultistep(cur)) applyStepMetronome()
		else if (ownsRoutineTimer(cur)) {
			metro?.configure(cfgFor(cur))
			metro?.start()
		}
		// Timer opted out → play freely (metronome keeps ticking) with no countdown / no auto-advance.
		if (runsCountdown(exercises[currentIndex])) startDisplayLoop()
	}

	function pause() {
		if (!running) return
		remainingSec = Math.max(0, computeRemaining())
		if (capActive) capRemaining = Math.max(0, computeCap()) // freeze the cap clock too
		running = false
		metro?.stop()
		audioCtx?.suspend()
		pulseBeat = -1
		stopDisplayLoop()
	}

	// The metronome-kind exercise runs one continuous click for its whole duration. Multistep now drives
	// its click per-step (see applyStepMetronome); video / fretboard run their countdown without one.
	function ownsRoutineTimer(ex: Exercise) {
		return exerciseKind(ex) === 'metronome'
	}

	// The multistep step currently playing (read from the raw array, not the derived, so callers can use
	// it immediately after mutating stepIndex within the same tick).
	function currentStep(): ExerciseStep | null {
		const ex = exercises[currentIndex]
		return isMultistep(ex) ? (ex.steps![stepIndex] ?? null) : null
	}

	// Reconcile the click with the current multistep step: (re)configure + start it when the step opted
	// into a metronome, else stop it. Silent during rests. No-op unless we're running.
	function applyStepMetronome() {
		const step = currentStep()
		if (!running || resting || !step || !step.metronomeEnabled) {
			metro?.stop()
			pulseBeat = -1
			return
		}
		metro?.configure(stepCfg(step))
		metro?.start() // no-op if already ticking (previous step's click carries straight through)
	}

	// Live-edit the current step's metronome from the run-mode ⚙ panel: persist the patch and reflect
	// it on the click immediately (computed from the merged step to avoid derived-timing races).
	function liveUpdateStep(patch: Partial<ExerciseStep>) {
		const ex = runExercise
		const step = currentStep()
		if (!ex || !step) return
		const merged = { ...step, ...patch }
		updateExercise(ex.id, { steps: ex.steps!.map((s) => (s.id === step.id ? merged : s)) })
		if (!running || resting) return
		if (merged.metronomeEnabled) {
			if (merged.ramp && !step.ramp) metro?.resetRamp() // newly switched on → climb from the start
			metro?.configure(stepCfg(merged))
			metro?.start()
		} else {
			metro?.stop()
			pulseBeat = -1
		}
	}

	// A multistep exercise: its own timer is disabled; the ordered steps' timers drive advancement.
	function isMultistep(ex: Exercise | null | undefined): boolean {
		return !!ex && exerciseKind(ex) === 'multistep' && (ex.steps?.length ?? 0) > 0
	}

	// A metronome exercise split into timed sections (see MetronomeSection). Its sections replace the
	// exercise timer: the countdown walks them under one unbroken click.
	function hasSections(ex: Exercise | null | undefined): boolean {
		return !!ex && exerciseKind(ex) === 'metronome' && (ex.sections?.length ?? 0) > 0
	}

	// A video/audio exercise whose loops auto-sequence in run mode (opt-in).
	function isVideoSequence(ex: Exercise | null | undefined): boolean {
		return (
			!!ex &&
			exerciseKind(ex) === 'video' &&
			!!ex.video?.timedLoops &&
			(ex.video.loops.length ?? 0) > 0
		)
	}
	// How the sequence sizes each loop: 'reps' (count A→B passes) or 'timer' (wall-clock). See VideoConfig.
	function loopSizing(ex: Exercise | null | undefined): LoopSizing {
		return ex?.video?.loopSizing ?? 'reps'
	}
	function loopDurOf(loop: { durationSec?: number }): number {
		return loop.durationSec ?? DEFAULT_LOOP_SEC
	}
	// Whether a page-timer countdown drives advancement for this exercise: multistep steps, a 'timer'-sized
	// video loop, or a plain exercise timer. A 'reps'-sized video sequence advances on A→B boundary events
	// (onLoopBoundary), NOT the timer — so it has no primary clock (the cap, if any, still runs via rAF).
	function hasPrimaryClock(ex: Exercise | null | undefined): boolean {
		if (isMultistep(ex)) return true
		if (isVideoSequence(ex)) return loopSizing(ex) === 'timer'
		if (hasSections(ex)) return true // sections are the clock, whatever the exercise timer says
		return timerOn(ex)
	}

	// Whether the page rAF loop should run at all: any primary clock, or a running cap (reps sequence + cap).
	function runsCountdown(ex: Exercise | null | undefined): boolean {
		return isMultistep(ex) || isVideoSequence(ex) || hasSections(ex) || timerOn(ex)
	}

	// Prime the countdown for a freshly-entered exercise. Single funnel used by enterRun / advanceInline /
	// goToExercise so multistep initializes identically no matter how the exercise was reached.
	function armExercise(ex: Exercise) {
		restTarget = null
		sectionIndex = 0
		holdingForCap = false
		awaitingLoopBoundary = false
		metro?.resetRamp() // a new exercise restarts the tempo climb (pause/resume and live edits don't)
		if (isMultistep(ex)) {
			stepIndex = 0
			stepRepeat = 0
			resting = false
			remainingSec = ex.steps![0].durationSec
		} else if (isVideoSequence(ex)) {
			resting = false
			loopIndex = 0
			loopRepeat = 0 // reps completed on the current loop ('reps' sizing); unused for 'timer'
			// 'timer' sizing → the loop timer is the primary clock; 'reps' → advance on A→B boundaries, no clock.
			remainingSec = loopSizing(ex) === 'timer' ? loopDurOf(ex.video!.loops[0]) : 0
			commandLoop() // tell VideoLooper to start loop 0 from A
		} else if (hasSections(ex)) {
			resting = false
			remainingSec = ex.sections![0].durationSec
		} else {
			resting = false
			remainingSec = ex.durationSec
		}
		armCap(ex)
		// Reached mid-run (advanceInline keeps running=true) → base the cap clock now. When reached via
		// enterRun/goToExercise running is false here and start() sets the base instead.
		if (capActive && running) {
			capSegStart = performance.now()
			capRemainingAtStart = capRemaining
		}
	}

	// Prime the second clock (exercise cap) for a timed-loop video whose timer is opted in. Other cases
	// have no separate cap: their single countdown IS the exercise timer (handled by remainingSec).
	function armCap(ex: Exercise) {
		capActive = isVideoSequence(ex) && timerOn(ex)
		capRemaining = capActive ? ex.durationSec : 0
	}

	// Ask VideoLooper (via the runLoopNonce prop) to (re)start the current loop from A.
	function commandLoop() {
		loopCmdNonce += 1
	}

	// Manual ⏮ in a timed-loop run: restart the CURRENT loop from the top — reset its progress (reps or
	// timer) so the readout starts over, drop any cap-hold, and re-seek the player to A.
	function restartCurrentLoop() {
		const ex = exercises[currentIndex]
		if (!isVideoSequence(ex)) return
		holdingForCap = false
		awaitingLoopBoundary = false
		if (loopSizing(ex) === 'timer') {
			remainingSec = loopDurOf(ex.video!.loops[loopIndex])
			armSegment()
		} else {
			loopRepeat = 0
		}
		commandLoop()
	}

	// Manual jump to any loop in a timed sequence (req 1): make it the current loop, reset its progress,
	// and re-seek the player to A. The exercise cap (if any) keeps running — only the loop position moves.
	function jumpToLoop(id: string) {
		const ex = exercises[currentIndex]
		if (!isVideoSequence(ex)) return
		const idx = ex.video!.loops.findIndex((l) => l.id === id)
		if (idx < 0) return
		holdingForCap = false
		awaitingLoopBoundary = false
		loopIndex = idx
		loopRepeat = 0
		if (loopSizing(ex) === 'timer') {
			remainingSec = loopDurOf(ex.video!.loops[idx])
			armSegment()
		}
		commandLoop()
	}

	// The cap clock advances on the same wall time as the loop timer, but never resets on a loop switch.
	function computeCap(): number {
		return capRemainingAtStart - (performance.now() - capSegStart) / 1000
	}

	// Label for the "Next:" preview — step count for a multistep exercise, otherwise its timer.
	function nextLabel(ex: Exercise): string {
		if (isMultistep(ex)) return `${ex.steps!.length} step${ex.steps!.length === 1 ? '' : 's'}`
		if (hasSections(ex))
			return `${ex.sections!.length} sections · ${formatMmss(sectionsTotalSec(ex.sections!))}`
		return timerOn(ex) ? formatMmss(ex.durationSec) : 'no timer'
	}

	// Whether the exercise-wide countdown is on. Metronome/fretboard: opt-OUT (undefined = on, legacy).
	// Video/audio: opt-IN (undefined = off) — its clock is the per-loop timers unless the user adds a cap.
	function timerOn(ex: Exercise | null | undefined) {
		if (!ex) return false
		if (exerciseKind(ex) === 'video') return ex.timerEnabled === true
		return ex.timerEnabled !== false
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
		armExercise(ex)
		armSegment()
		if (isMultistep(ex)) {
			applyStepMetronome() // step 0's click, if it opted in
		} else if (ownsRoutineTimer(ex)) {
			metro?.configure(cfgFor(ex))
			metro?.start() // running stays true → seamless into the next metronome step
		} else {
			pulseBeat = -1 // video/fretboard: countdown keeps running, just no clicks
		}
	}

	// Called from inside the rAF frame when a multistep step's countdown reaches 0. Walks the
	// repeat → rest → next-step → next-exercise machine (rest only between distinct steps, req 7).
	function onStepComplete() {
		const ex = exercises[currentIndex]
		const steps = ex.steps!
		if (resting) {
			// Rest gap finished → do whatever it was leading into (next repeat, or next step).
			resting = false
			if (restTarget === 'rep') {
				stepRepeat += 1
				remainingSec = steps[stepIndex].durationSec
			} else {
				stepIndex += 1
				stepRepeat = 0
				remainingSec = steps[stepIndex].durationSec
				metro?.resetRamp() // new step → its ramp starts over (reps of one step keep climbing)
			}
			restTarget = null
			armSegment()
			if (audioCtx) beep(audioCtx)
			applyStepMetronome() // resume the (now-current) step's click
			return
		}
		const step = steps[stepIndex]
		if (stepRepeat + 1 < step.repeatCount) {
			// More repeats of the same step. Opt-in: insert a rest between reps (req: restBetweenReps);
			// otherwise run them back-to-back (req 6).
			if (step.restBetweenReps && step.restSec > 0) {
				resting = true
				restTarget = 'rep'
				remainingSec = step.restSec
				armSegment()
				applyStepMetronome() // resting → silences the click
				return
			}
			stepRepeat += 1
			remainingSec = step.durationSec
			armSegment()
			applyStepMetronome() // same step → restarts the measure on the rep's downbeat
			return
		}
		// All repeats of this step are done.
		if (stepIndex + 1 < steps.length) {
			if (step.restSec > 0) {
				resting = true // count down the rest before the next step
				restTarget = 'step'
				remainingSec = step.restSec
				armSegment()
				applyStepMetronome() // resting → silences the click
				return
			}
			stepIndex += 1
			stepRepeat = 0
			remainingSec = steps[stepIndex].durationSec
			armSegment()
			if (audioCtx) beep(audioCtx)
			metro?.resetRamp() // new step → its ramp starts over
			applyStepMetronome() // reconfigure to the next step's tempo (or stop if it opted out)
			return
		}
		// Last step, last repeat → on to the next exercise (no trailing rest).
		advanceInline()
	}

	// A metronome section's countdown reached 0: move to the next section, or advance the exercise on
	// the last one. The click is deliberately left alone — no configure(), no resetRamp() — so the
	// tempo (and any ramp climbing through it) runs straight across the boundary.
	function onSectionComplete() {
		const secs = exercises[currentIndex].sections!
		if (sectionIndex + 1 >= secs.length) {
			advanceInline()
			return
		}
		sectionIndex += 1
		remainingSec = secs[sectionIndex].durationSec
		armSegment()
		if (audioCtx) beep(audioCtx)
	}

	// Timed-loop video, 'timer' sizing: the current loop's countdown reached 0. Don't cut the pass off
	// mid-lick — freeze the clock at 0 and wait for the current A→B loop to finish before switching
	// (graceful, like the exercise-cap finish, req 7). The switch happens on the next boundary below.
	function onLoopComplete() {
		awaitingLoopBoundary = true
		remainingSec = 0
	}

	// Move the sequence forward one loop (shared by 'timer' and 'reps' sizing). Always called AT an
	// A→B boundary so no pass is ever cut short: next loop, then (last loop) hold for the cap or advance
	// the exercise. Resets the loop clock only for 'timer' sizing ('reps' has none).
	function advanceLoopSequence() {
		const ex = exercises[currentIndex]
		const loops = ex.video!.loops
		if (loopIndex + 1 < loops.length) {
			loopIndex += 1
			loopRepeat = 0
			if (loopSizing(ex) === 'timer') {
				remainingSec = loopDurOf(loops[loopIndex])
				armSegment()
			}
			if (audioCtx) beep(audioCtx)
			commandLoop()
			return
		}
		// All loops done. If an exercise cap is still ticking, hold on the last loop until it expires
		// (the cap clock keeps running and advances the exercise); otherwise advance now.
		if (capActive) {
			holdingForCap = true
			remainingSec = 0
			return
		}
		advanceInline()
	}

	// VideoLooper fired an A→B boundary (every wrap in run mode). Both sizings ride the same event:
	//  - 'timer': the loop's countdown already expired and we're finishing the current pass → switch now.
	//  - 'reps':  count the pass; switch once the loop has played its repeatCount passes.
	// Runs outside the rAF frame — the frame keeps ticking (for the cap) since advances leave running=true.
	function onLoopBoundary() {
		const ex = exercises[currentIndex]
		if (!isVideoSequence(ex)) return
		if (!running || holdingForCap || pendingAdvance) return // ignore while frozen/finishing/paused
		if (loopSizing(ex) === 'timer') {
			if (awaitingLoopBoundary) {
				awaitingLoopBoundary = false // the pass finished → make the deferred switch
				advanceLoopSequence()
			}
			return // timer not yet expired → let the loop keep playing
		}
		// 'reps' sizing: count this pass; advance when the loop has played all its repeats.
		const reps = loopReps(ex.video!.loops[loopIndex])
		loopRepeat += 1
		if (loopRepeat < reps) return // more passes of this loop
		advanceLoopSequence()
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
		armExercise(exercises[index])
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
		armExercise(ex) // multistep: back to step 1; others: reset the exercise timer
		armSegment()
		if (running) {
			if (isMultistep(ex))
				applyStepMetronome() // step 1's click (or silence if it opted out)
			else if (ownsRoutineTimer(ex)) {
				metro?.stop()
				metro?.configure(cfgFor(ex))
				metro?.start()
			}
		}
	}

	function jump(dir: -1 | 1) {
		const target = currentIndex + dir
		if (target < 0 || target >= exercises.length) return
		goToExercise(target)
	}

	// Manual jump to any step in a multistep exercise (req 2): reset the rep counter + rest, arm that
	// step's timer, and reconcile the click. Keeps `running` as-is (a jump while paused stays paused).
	function jumpToStep(idx: number) {
		const ex = exercises[currentIndex]
		if (!isMultistep(ex)) return
		const steps = ex.steps!
		if (idx < 0 || idx >= steps.length) return
		resting = false
		restTarget = null
		holdingForCap = false
		stepIndex = idx
		stepRepeat = 0
		remainingSec = steps[idx].durationSec
		armSegment()
		metro?.resetRamp()
		applyStepMetronome()
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

<div class="flex flex-col bg-cream text-teal min-h-full">
	{#if mode === 'edit'}
		<!-- ===== Edit mode ===== -->
		<div
			class="sticky top-0 z-10 bg-cream border-b border-teal/20 px-3 py-2 sm:px-4 shrink-0 flex flex-col gap-2"
		>
			{#if loadError}
				<div class="flex items-center justify-between gap-1 bg-error/10 text-error rounded px-2 py-1 text-xs border border-error/30" role="alert">
					<span>{loadError}</span>
					<button class="btn btn-xs btn-ghost" onclick={() => (loadError = '')} aria-label="Dismiss error">✕</button>
				</div>
			{/if}
			<!-- Routine library control -->
			<div class="flex gap-1.5 items-center flex-wrap">
				<select
					class="select select-xs sm:select-sm select-bordered bg-white border-teal/30 max-w-[45%]"
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
						class="input input-xs sm:input-sm input-bordered flex-1 bg-white border-teal/30"
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
					onclick={() => enterRun()}
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
						dragging={dragIndex === i}
						dropTarget={dragOverIndex === i && dragIndex !== i}
						onUpdate={(patch) => updateExercise(ex.id, patch)}
						onRemove={() => removeExercise(ex.id)}
						moveTargets={routines.filter((r) => r.id !== activeId)}
						onMoveToRoutine={(rid) => moveToRoutine(ex.id, rid)}
						onRun={() => enterRun(i)}
						onMoveUp={() => moveExercise(i, -1)}
						onMoveDown={() => moveExercise(i, 1)}
						onDragStart={(e) => onExerciseDragStart(e, i)}
						onDragOver={(e) => onExerciseDragOver(e, i)}
						onDrop={(e) => onExerciseDrop(e, i)}
						onDragEnd={onExerciseDragEnd}
					/>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- ===== Run mode ===== -->
		{#snippet countdownBar()}
			<!-- Countdown for video/fretboard steps: same machinery as the metronome timer, minus the
				 clicks. Rings the last-5s bell; on zero it advances (or finishes). Opt-out → "No timer". -->
			<div class="flex flex-col items-center gap-2 w-full max-w-md">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-50">Exercise timer</span>
				{#if !timerOn(runExercise)}
					<div class="text-2xl font-mono opacity-60">No timer</div>
					<div class="text-xs opacity-50">Play freely — use Skip to advance.</div>
				{:else if finished}
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
					<div class="w-full h-2 bg-teal/15 rounded-full overflow-hidden">
						<div
							class="h-full bg-teal transition-[width] duration-100"
							style="width: {runProgress * 100}%"
						></div>
					</div>
				{/if}
				{#if timerOn(runExercise)}
					<div class="flex gap-2">
						{#if finished}
							<button class="btn btn-sm btn-primary" onclick={() => enterRun()}>↻ Restart</button>
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
				{/if}
			</div>
		{/snippet}

		{#snippet fullControls()}
			<!-- Full transport for exercises whose own countdown IS the main timer (metronome, multistep). -->
			<div class="flex gap-2 flex-wrap justify-center mt-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => jump(-1)}
					disabled={currentIndex === 0}>⏮ Prev</button
				>
				{#if finished}
					<button class="btn btn-sm btn-primary" onclick={() => enterRun()}>↻ Restart</button>
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

			<h2 class="text-2xl sm:text-3xl font-bold" style="font-family: KNUTRUTHTTF, sans-serif;">
				{runExercise?.name}
			</h2>

			{#if runExercise?.video}
				<!-- Video/audio loop exercise: own countdown (opt-out-able), no metronome chain -->
				{#key runExercise.id}
					<div class="w-full max-w-2xl text-left">
						<VideoLooper
							video={runExercise.video}
							mode="run"
							finishing={pendingAdvance}
							onFinished={onChildBoundary}
							{runLoopId}
							runLoopNonce={loopCmdNonce}
							{onLoopBoundary}
							onRestartLoop={restartCurrentLoop}
							onJumpLoop={jumpToLoop}
							onChange={(v) => runExercise && updateExercise(runExercise.id, { video: v })}
						/>
					</div>
				{/key}

				{#if isVideoSequence(runExercise)}
					<!-- Timed-loop sequence: 'reps' loops advance on A→B passes, 'timer' loops on a countdown.
						 The exercise timer (if opted-in) is a parallel cap that can cut the sequence short. -->
					{#if finished}
						<div class="text-5xl sm:text-7xl font-mono">Done</div>
					{:else}
						{@const reps = runsReps ? runLoopReps : 0}
						<div class="text-sm opacity-60">
							Loop {loopIndex + 1} / {runExercise.video.loops.length}
							{#if runLoop?.label}
								· {runLoop.label}
							{/if}
						</div>

						{#if holdingForCap}
							<div class="text-3xl sm:text-4xl font-mono opacity-50 uppercase tracking-wide">
								Holding…
							</div>
						{:else if awaitingLoopBoundary}
							<div class="text-3xl sm:text-4xl font-mono opacity-50 uppercase tracking-wide">
								Finishing loop…
							</div>
						{:else if runsReps}
							<!-- 'reps' sizing: the rep count is the primary readout (no loop countdown). -->
							<div class="font-mono tabular-nums leading-none">
								<span class="text-2xl sm:text-3xl opacity-60">Rep </span><span
									class="text-6xl sm:text-8xl">{Math.min(loopRepeat + 1, reps)}</span
								><span class="text-3xl sm:text-5xl opacity-70"> / {reps}</span>
							</div>
						{:else}
							<!-- 'timer' sizing: the loop countdown is the primary readout. -->
							<div class="font-mono tabular-nums leading-none">
								<span class="text-6xl sm:text-8xl">{formatMmss(Math.floor(remainingSec))}</span
								><span class="text-3xl sm:text-5xl opacity-70"
									>.{formatMmssMs(remainingSec).split('.')[1]}</span
								>
							</div>
						{/if}

						<div class="w-full max-w-md h-2 bg-teal/15 rounded-full overflow-hidden">
							<div
								class="h-full bg-teal transition-[width] duration-100"
								style="width: {runProgress * 100}%"
							></div>
						</div>

						{#if capActive}
							<div class="text-sm opacity-50">
								Exercise cap: {formatMmss(Math.ceil(capRemaining))}
							</div>
						{/if}
					{/if}

					{@render fullControls()}
				{:else}
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
				{/if}
			{:else if runExercise?.fretboard}
				<!-- Fretboard exercise (diagram or quiz): own countdown (opt-out-able), no metronome -->
				{#key runExercise.id}
					<div class="w-full max-w-2xl">
						<FretboardExercise
							config={runExercise.fretboard}
							finishing={pendingAdvance}
							onFinished={onChildBoundary}
							revealCtx={audioCtx}
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
			{:else if isMultistep(runExercise)}
				<!-- Multistep exercise: per-step timers drive advancement; no exercise timer, no metronome -->
				{#if finished}
					<div class="text-5xl sm:text-7xl font-mono">Done</div>
				{:else}
					<div class="text-sm opacity-60">
						Step {stepIndex + 1} / {runExercise?.steps?.length ?? 0}
						{#if runStep && runStep.repeatCount > 1}
							· Rep {stepRepeat + 1} / {runStep.repeatCount}
						{/if}
					</div>

					{#if resting}
						<div class="text-3xl sm:text-4xl font-mono opacity-50 uppercase tracking-wide">
							Rest
						</div>
					{/if}

					<div class="font-mono tabular-nums leading-none {resting ? 'opacity-50' : ''}">
						<span class="text-6xl sm:text-8xl">{formatMmss(Math.floor(remainingSec))}</span><span
							class="text-3xl sm:text-5xl opacity-70"
							>.{formatMmssMs(remainingSec).split('.')[1]}</span
						>
					</div>

					<div class="w-full max-w-md h-2 bg-teal/15 rounded-full overflow-hidden">
						<div
							class="h-full bg-teal transition-[width] duration-100"
							style="width: {runProgress * 100}%"
						></div>
					</div>

					{#if runStep?.description}
						<p class="text-base sm:text-lg max-w-md whitespace-pre-wrap opacity-80">
							{runStep.description}
						</p>
					{:else}
						<p class="text-sm opacity-40">No description for this step.</p>
					{/if}
				{/if}

				{#if !finished}
					{#if runNextStepLabel}
						<div class="text-sm opacity-50">Next: {runNextStepLabel}</div>
					{:else if nextExercise}
						<div class="text-sm opacity-50">
							Next exercise: {nextExercise.name} ({nextLabel(nextExercise)})
						</div>
					{:else}
						<div class="text-sm opacity-50">Last step</div>
					{/if}
				{/if}

				<!-- Steps list (req 2): foldable rows like the loop list. ▶ Play jumps to any step; the
					 current one shows Now/Rest. Tap a row to reveal its full description. -->
				{#if !finished && runExercise?.steps}
					<div class="w-full max-w-md flex flex-col gap-1.5 text-left">
						<span class="text-[0.65rem] uppercase tracking-wide opacity-50 text-center"
							>Steps — tap ▶ to jump</span
						>
						{#each runExercise.steps as st, si (st.id)}
							{@const stExpanded = expandedStepId === st.id}
							{@const stMetro = stepMetronome(st)}
							<div
								class="rounded border {si === stepIndex
									? 'border-teal bg-teal/5'
									: 'border-teal/20 bg-white'}"
							>
								<div class="flex items-center gap-1.5 p-1.5">
									{#if si === stepIndex}
										<span
											class="shrink-0 w-16 text-center text-xs px-1 py-1 rounded bg-teal text-cream"
											>{resting ? '⏸ Rest' : '▶ Now'}</span
										>
									{:else}
										<button
											class="btn btn-xs btn-outline shrink-0 w-16"
											onclick={() => jumpToStep(si)}
											title="Jump to this step">▶ Play</button
										>
									{/if}
									<button
										class="flex-1 text-left min-w-0"
										onclick={() => (expandedStepId = stExpanded ? null : st.id)}
									>
										<div class="font-medium truncate">
											Step {si + 1}{st.description ? ` — ${st.description}` : ''}
										</div>
										<div class="text-xs opacity-60">
											{formatMmss(st.durationSec)}{st.repeatCount > 1
												? ` · ×${st.repeatCount}`
												: ''}{st.metronomeEnabled ? ` · ${stMetro.bpm} bpm` : ''}
										</div>
									</button>
									<button
										class="btn btn-xs btn-ghost shrink-0"
										onclick={() => (expandedStepId = stExpanded ? null : st.id)}
										aria-label="Toggle step details">{stExpanded ? '▲' : '▼'}</button
									>
								</div>
								{#if stExpanded}
									<div
										class="border-t border-teal/10 p-2 text-sm whitespace-pre-wrap opacity-80"
									>
										{st.description || 'No description for this step.'}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				<!-- Per-step metronome (opt-in) beat indicator — reflects the CURRENT step's tempo; hidden
					 during rests (the click is silent then). -->
				{#if runStep?.metronomeEnabled && runStepMetro && !resting && !finished}
					<div class="flex flex-col items-center gap-2">
						<div class="text-sm opacity-60">
							{bpmLabel(runStepMetro)} · {runStepMetro.subdivision === 'quarter'
								? '1/4'
								: runStepMetro.subdivision === 'eighth'
									? '1/8'
									: '1/16'} ticks
						</div>
						<div class="flex gap-1.5">
							{#each Array(runStepMetro.beatsPerMeasure) as _, beat}
								<div
									class="w-4 h-4 rounded-full border-2 border-teal transition-all duration-75
										{pulseBeat === beat ? 'bg-teal scale-125' : 'bg-transparent'}
										{runStepMetro.accentBeats.includes(beat) ? 'border-teal' : 'border-teal/30'}"
								></div>
							{/each}
						</div>
					</div>
				{/if}

				{@render fullControls()}

				<!-- Live metronome editor for the CURRENT step, incl. an on/off toggle (changes apply on the
					 fly). Disabled during a rest — there's no active step to edit. -->
				{#if runStep && runStepMetro && !finished}
					<div class="w-full max-w-md">
						<button
							class="btn btn-xs btn-ghost"
							onclick={() => (runSettingsOpen = !runSettingsOpen)}
							>{runSettingsOpen ? '▲ Hide metronome' : '⚙ Metronome'} (step {stepIndex + 1})</button
						>
						{#if runSettingsOpen}
							<div
								class="mt-2 text-left rounded border border-teal/20 bg-white/60 p-2 flex flex-col gap-2"
							>
								{#if resting}
									<p class="text-xs opacity-50">Resting — metronome resumes on the next step.</p>
								{/if}
								<label class="flex items-center gap-1.5 cursor-pointer w-fit">
									<input
										type="checkbox"
										class="checkbox checkbox-xs"
										checked={runStep.metronomeEnabled === true}
										onchange={(e) =>
											liveUpdateStep({ metronomeEnabled: (e.target as HTMLInputElement).checked })}
									/>
									<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Metronome</span>
								</label>
								{#if runStep.metronomeEnabled}
									<MetronomeSettings value={runStepMetro} onUpdate={liveUpdateStep} />
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				{#if finished}
					<div class="text-5xl sm:text-7xl font-mono">Done</div>
				{:else if !timerOn(runExercise) && !hasSections(runExercise)}
					<div class="text-4xl sm:text-6xl font-mono opacity-60">No timer</div>
				{:else}
					<div class="font-mono tabular-nums leading-none">
						<span class="text-6xl sm:text-8xl">{formatMmss(Math.floor(remainingSec))}</span><span
							class="text-3xl sm:text-5xl opacity-70"
							>.{formatMmssMs(remainingSec).split('.')[1]}</span
						>
					</div>
				{/if}

				<!-- Progress bar (timer steps + sectioned exercises) -->
				{#if timerOn(runExercise) || hasSections(runExercise)}
					<div class="w-full max-w-md h-2 bg-teal/15 rounded-full overflow-hidden">
						<div
							class="h-full bg-teal transition-[width] duration-100"
							style="width: {runProgress * 100}%"
						></div>
					</div>
				{/if}

				<!-- Which section is playing (metronome sections) -->
				{#if hasSections(runExercise) && !finished}
					{@const secs = runExercise!.sections!}
					<div class="flex flex-col items-center gap-0.5">
						<div class="text-lg font-medium">
							{secs[sectionIndex]?.label || `Section ${sectionIndex + 1}`}
						</div>
						<div class="text-xs opacity-50">
							Section {sectionIndex + 1} / {secs.length}{secs[sectionIndex + 1]
								? ` · next: ${secs[sectionIndex + 1].label}`
								: ''}
						</div>
					</div>
				{/if}

				<!-- Tempo + beat indicator -->
				{#if runExercise}
					<div class="flex flex-col items-center gap-2">
						<div class="text-sm opacity-60">
							{bpmLabel(runExercise)} · {runExercise.subdivision === 'quarter'
								? '1/4'
								: runExercise.subdivision === 'eighth'
									? '1/8'
									: '1/16'} ticks
						</div>
						<div class="flex gap-1.5">
							{#each Array(runExercise.beatsPerMeasure) as _, beat}
								<div
									class="w-4 h-4 rounded-full border-2 border-teal transition-all duration-75
										{pulseBeat === beat ? 'bg-teal scale-125' : 'bg-transparent'}
										{runExercise.accentBeats.includes(beat) ? 'border-teal' : 'border-teal/30'}"
								></div>
							{/each}
						</div>
					</div>
				{/if}

				{#if nextExercise && !finished}
					<div class="text-sm opacity-50">
						Next: {nextExercise.name} ({nextLabel(nextExercise)})
					</div>
				{:else if !finished}
					<div class="text-sm opacity-50">Last exercise</div>
				{/if}

				<!-- Controls -->
				{@render fullControls()}

				<!-- Live metronome editor (changes apply on the fly) -->
				{#if runExercise}
					<div class="w-full max-w-md">
						<button
							class="btn btn-xs btn-ghost"
							onclick={() => (runSettingsOpen = !runSettingsOpen)}
							>{runSettingsOpen ? '▲ Hide settings' : '⚙ Settings'}</button
						>
						{#if runSettingsOpen}
							<div class="mt-2 text-left rounded border border-teal/20 bg-white/60 p-2">
								<MetronomeSettings value={runExercise} onUpdate={liveUpdateExercise} />
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Floating jump-to-edge button: contextual ▼ (to bottom) / ▲ (to top), edit mode when scrollable -->
	{#if mode === 'edit' && slotScrollable}
		<button
			class="btn btn-sm btn-circle btn-primary fixed bottom-4 right-4 z-20 shadow-lg"
			onclick={scrollToEdge}
			aria-label={scrollAtTop ? 'Scroll to bottom' : 'Scroll to top'}
			title={scrollAtTop ? 'Scroll to bottom' : 'Scroll to top'}>{scrollAtTop ? '▼' : '▲'}</button
		>
	{/if}
</div>
