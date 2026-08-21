// Data model for the Guitar Routine page.
//
// A Routine is an ordered list of Exercises played in sequence. Each Exercise has a
// countdown timer plus its own metronome settings.

import { uid } from '$lib/utils/id'

export type Subdivision = 'quarter' | 'eighth' | 'sixteenth' // ticks per beat = 1 | 2 | 4

// The exercise's kind. Legacy routines predate this field; `exerciseKind()` infers it from presence.
export type ExerciseKind = 'metronome' | 'video' | 'fretboard' | 'multistep'

// The four fields that fully describe a metronome click. Shared by the metronome/fretboard exercise
// kinds (stored on the Exercise) and by each multistep step (stored on the step, resolved via
// stepMetronome() so legacy steps fall back to sensible defaults).
export interface MetronomeParams {
	bpm: number
	subdivision: Subdivision
	beatsPerMeasure: number
	accentBeats: number[]
	ramp?: TempoRamp // opt-in gradual tempo change; `bpm` is then the STARTING tempo
}

export const DEFAULT_METRONOME: MetronomeParams = {
	bpm: 100,
	subdivision: 'quarter',
	beatsPerMeasure: 4,
	accentBeats: [0]
}

// ---- Tempo ramp ------------------------------------------------------------
// Opt-in per metronome: start at MetronomeParams.bpm and climb (or fall) by `stepBpm` every
// `everyMeasures` measures until `endBpm`, then hold there. Same shape as SpeedTrainer, counted in
// measures instead of A-B passes. Transient like SpeedTrainer: it drives the click, it never
// rewrites the stored bpm.
export interface TempoRamp {
	endBpm: number
	stepBpm: number // magnitude of one bump; the direction comes from the endpoints
	everyMeasures: number // measures to hold each tempo before bumping (>= 1)
}

export const BPM_MIN = 20
export const BPM_MAX = 400

export const DEFAULT_TEMPO_RAMP: TempoRamp = { endBpm: 140, stepBpm: 5, everyMeasures: 4 }

// Tempo after `measures` completed measures, clamped to the ramp's own endpoints so it lands exactly
// ON endBpm and holds there — a ramp that overshoots plays faster than the user asked for.
export function bpmAtMeasure(startBpm: number, ramp: TempoRamp, measures: number): number {
	const dir = ramp.endBpm < startBpm ? -1 : 1
	const tier = Math.floor(Math.max(0, measures) / Math.max(1, Math.floor(ramp.everyMeasures)))
	const raw = startBpm + dir * Math.abs(ramp.stepBpm) * tier
	const lo = Math.min(startBpm, ramp.endBpm)
	const hi = Math.max(startBpm, ramp.endBpm)
	return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(Math.min(hi, Math.max(lo, raw)))))
}

// ---- Countdown sections ----------------------------------------------------
// A metronome exercise can be split into timed sections: the click runs UNBROKEN while the countdown
// walks section → section ("play this pattern for 30s, then the next"). Only the label and the clock
// change at a boundary; the tempo is exercise-wide (TempoRamp is what moves it). Sections replace the
// exercise timer while they exist. Multistep is the near-neighbor — it restarts the click per step
// and adds reps/rests/per-step tempo; sections are the flat, one-click, uniform-time case.
export interface MetronomeSection {
	id: string
	label: string
	durationSec: number
}

export const DEFAULT_SECTION_SEC = 30

export function makeSection(index: number, durationSec = DEFAULT_SECTION_SEC): MetronomeSection {
	return { id: uid(), label: `Section ${index + 1}`, durationSec }
}

export function sectionsTotalSec(sections: MetronomeSection[]): number {
	return sections.reduce((t, s) => t + Math.max(0, s.durationSec), 0)
}

// One step of a multistep exercise: its own countdown, a free-text description, an optional repeat
// count (loops the step back-to-back), a rest gap inserted before the NEXT step, and its OWN
// metronome (opt-in per step — the click reconfigures at each step boundary).
export interface ExerciseStep {
	id: string
	description: string // req 4: what to practice this step
	durationSec: number // req 2: per-step timer
	repeatCount: number // req 6: loop this step N times back-to-back (>= 1)
	restSec: number // req 7: rest after this step, before the next step (0 = none)
	restBetweenReps?: boolean // opt-in: also insert restSec between repeats of THIS step (default off)
	// Per-step metronome (opt-in). When enabled, the click plays this step at the params below; the
	// params are optional and resolved through stepMetronome() so legacy steps use DEFAULT_METRONOME.
	metronomeEnabled?: boolean
	bpm?: number
	subdivision?: Subdivision
	beatsPerMeasure?: number
	accentBeats?: number[]
	ramp?: TempoRamp
}

// Resolve a step's metronome params, filling any unset field from DEFAULT_METRONOME.
export function stepMetronome(step: ExerciseStep): MetronomeParams {
	return {
		bpm: step.bpm ?? DEFAULT_METRONOME.bpm,
		subdivision: step.subdivision ?? DEFAULT_METRONOME.subdivision,
		beatsPerMeasure: step.beatsPerMeasure ?? DEFAULT_METRONOME.beatsPerMeasure,
		accentBeats: step.accentBeats ?? DEFAULT_METRONOME.accentBeats,
		ramp: step.ramp
	}
}

export interface Exercise {
	id: string
	name: string // custom, user-editable
	kind?: ExerciseKind // undefined on legacy routines; see exerciseKind()
	durationSec: number // stored as seconds; edited in the UI as m / s boxes
	timerEnabled?: boolean // opt-out flag; undefined = on (legacy routines). Off = no countdown, manual advance.
	bpm: number
	subdivision: Subdivision // how often the metronome ticks
	beatsPerMeasure: number // measure length (time-signature numerator)
	accentBeats: number[] // 0-based beat indices that are "on beat" (louder tick)
	ramp?: TempoRamp // opt-in gradual tempo change across the exercise (bpm above = the start tempo)
	// Metronome kind: timed sections walked under one continuous click (see MetronomeSection). While
	// non-empty they replace the exercise timer. `perSectionTimes` off (default) = one shared length.
	sections?: MetronomeSection[]
	perSectionTimes?: boolean
	video?: VideoConfig // when present, this is a video-loop exercise (countdown applies, no metronome)
	fretboard?: FretboardConfig // when present, this is a fretboard exercise (countdown applies, no metronome)
	steps?: ExerciseStep[] // multistep exercise: the exercise timer is disabled; step timers drive advancement
	// Legacy: pre-per-step multistep click (one tempo across every step). No longer written — migration
	// folds a `true` here into each step's own metronome. Kept only so old routines still migrate.
	metronomeEnabled?: boolean
}

// Resolve an exercise's kind, inferring from presence for legacy routines that predate the field.
export function exerciseKind(ex: Exercise): ExerciseKind {
	return ex.kind ?? (ex.video ? 'video' : ex.fretboard ? 'fretboard' : 'metronome')
}

// ---- Fretboard trainer -----------------------------------------------------
// An exercise can instead draw a fretboard diagram. One exercise = one view.

export type FretView = 'chord' | 'scale' | 'seventh' | 'notemap' | 'quiz'
export type SeventhType = 'maj7' | 'dom7' | 'min7' | 'min7b5' | 'dim7'
export type ScaleType = 'major' | 'minor' | 'majPenta' | 'minPenta'

export interface FretboardConfig {
	view: FretView
	rootPc?: number // 0..11 (C=0); chord / scale / seventh
	quality?: 'major' | 'minor' // chord
	scaleType?: ScaleType // scale
	seventhType?: SeventhType // seventh
	rootString?: 6 | 5 // chord=6, scale=5 (fixed); seventh = user 6|5
	includeNotes?: boolean // quiz: draw natural notes
	quizNoteNaming?: 'letters' | 'solfege' // quiz: label notes as C–B or Do–Ti (default letters)
	includeSevenths?: boolean // quiz: draw 7th-chord names
	quizSevenths?: SeventhType[] // quiz: which 7th types to ask (undefined/empty → all five)
	includeTriads?: boolean // quiz: draw plain major/minor chords
	quizRootString?: 6 | 5 | 'both' // quiz: root string for chord questions
	guessSec?: number // quiz: time to guess before reveal
	bpm?: number // scale: playback tempo
	// Scale practice controls. scaleTypes = which boards to show (undefined → all four). The rest are
	// the shared metronome params (same system as the chromatic exercise) applied to scale playback:
	// the note steps once per tick and, when scaleClick is on, an accented/soft click sounds too.
	scaleTypes?: ScaleType[]
	scaleSubdivision?: Subdivision
	scaleBeatsPerMeasure?: number
	scaleAccentBeats?: number[]
	scaleClick?: boolean // audible metronome click alongside the note tones (default on)
}

export const REVEAL_SEC = 5 // quiz: how long the answer shows before the next prompt

export const SCALE_TYPE_LABELS: { key: ScaleType; label: string }[] = [
	{ key: 'major', label: 'Major' },
	{ key: 'minor', label: 'Minor' },
	{ key: 'majPenta', label: 'Maj pent' },
	{ key: 'minPenta', label: 'Min pent' }
]

export const SEVENTH_LABELS: { key: SeventhType; label: string }[] = [
	{ key: 'maj7', label: 'maj7' },
	{ key: 'dom7', label: '7' },
	{ key: 'min7', label: 'm7' },
	{ key: 'min7b5', label: 'm7♭5' },
	{ key: 'dim7', label: 'dim7' }
]

// ---- Video loop trainer ----------------------------------------------------
// An exercise can instead be a video practice loop: a YouTube embed or a local file,
// with multiple A-B loop regions the user switches between, each at its own speed.

export interface VideoLoop {
	id: string
	label: string // user label, defaults to "Loop N"
	startSec: number // A
	endSec: number // B (must be > startSec)
	rate: number // playback speed for this loop (YouTube snaps to the YT_RATE_RANGE grid)
	// Speed trainer (opt-in, presence = on): ramp the rate across repetitions instead of holding
	// `rate`. See SpeedTrainer — while it's set, `rate` is ignored for this loop.
	speed?: SpeedTrainer
	// Timed-loop sequence (opt-in via VideoConfig.timedLoops): how this loop is sized before the sequence
	// advances. Which one applies is chosen exercise-wide by VideoConfig.loopSizing:
	//   'reps'  → play A→B `repeatCount` full times (counted at each B boundary), then advance.
	//   'timer' → replay A→B for `durationSec` seconds, then advance.
	// Undefined → DEFAULT_LOOP_SEC / DEFAULT_LOOP_REPS.
	durationSec?: number
	repeatCount?: number
}

export type VideoSource =
	| { kind: 'youtube'; videoId: string }
	// bytes stored in IndexedDB under fileId. mediaKind picks the player element; missing = legacy video.
	| { kind: 'file'; fileId: string; fileName: string; mediaKind?: 'audio' | 'video' }

export interface VideoConfig {
	source: VideoSource
	loops: VideoLoop[]
	preservesPitch?: boolean // local-file only; default true (slow down without pitch shift)
	// Shared single-active flag: at most one loop is "active" (its A-B region loops). When null
	// the video plays through normally and loops back to the start when it finishes.
	activeLoopId?: string | null
	// Opt-in: in run mode, auto-sequence the loops top-to-bottom (see VideoLoop for per-loop sizing).
	// Off → the user drives loops manually (the exercise timer, if any, is the clock).
	timedLoops?: boolean
	// How every loop in the sequence is sized before advancing (see VideoLoop). Undefined → 'reps'.
	loopSizing?: LoopSizing
}

export type LoopSizing = 'reps' | 'timer'

// Default per-loop timer length ('timer' sizing) and rep count ('reps' sizing) when unset on a loop.
export const DEFAULT_LOOP_SEC = 30
export const DEFAULT_LOOP_REPS = 4

// ---- Speed trainer ---------------------------------------------------------
// Per-loop, opt-in: play the loop slow and climb. The rate starts at `startRate` and steps by
// `stepRate` every `everyReps` A→B passes until it reaches `endRate`, where it stays. Descending
// ramps (endRate < startRate) work too — `stepRate` is a magnitude, the direction comes from the
// endpoints. The ramp is transient: it drives the player, it never rewrites VideoLoop.rate.
export interface SpeedTrainer {
	startRate: number
	endRate: number
	stepRate: number // magnitude of one bump
	everyReps: number // passes to hold each rate before bumping (>= 1)
}

// Sensible first ramp when the trainer is switched on; the UI seeds startRate from the loop's rate.
export const DEFAULT_SPEED_TRAINER: SpeedTrainer = {
	startRate: 0.7,
	endRate: 1,
	stepRate: 0.05,
	everyReps: 2
}

// How many distinct rates the ramp visits, both endpoints included. A ramp whose span isn't a whole
// multiple of stepRate still ends AT endRate (the last tier is clamped), hence the +1 tier.
export function speedTiers(sp: SpeedTrainer): number {
	const span = Math.abs(sp.endRate - sp.startRate)
	const step = Math.max(0.01, Math.abs(sp.stepRate))
	return Math.ceil(span / step - 1e-6) + 1
}

// Total A→B passes a speed-trained loop plays: every tier held for everyReps passes. For 'reps'
// sizing this REPLACES VideoLoop.repeatCount — the ramp already states how long the loop runs.
export function speedRampReps(sp: SpeedTrainer): number {
	return speedTiers(sp) * Math.max(1, Math.floor(sp.everyReps))
}

// How many A→B passes a loop plays before a timed sequence advances ('reps' sizing). A speed-trained
// loop's ramp already states its own length, so it overrides repeatCount — the page and VideoLooper
// must agree on this number or the readout and the advance disagree.
export function loopReps(loop: VideoLoop): number {
	return loop.speed ? speedRampReps(loop.speed) : Math.max(1, loop.repeatCount ?? DEFAULT_LOOP_REPS)
}

// Playback rate after `passes` completed A→B passes, clamped to the ramp's own endpoints.
export function rateAtPass(sp: SpeedTrainer, passes: number): number {
	const dir = sp.endRate < sp.startRate ? -1 : 1
	const tier = Math.min(
		speedTiers(sp) - 1,
		Math.floor(Math.max(0, passes) / Math.max(1, Math.floor(sp.everyReps)))
	)
	const raw = sp.startRate + dir * Math.abs(sp.stepRate) * tier
	const lo = Math.min(sp.startRate, sp.endRate)
	const hi = Math.max(sp.startRate, sp.endRate)
	return Math.round(Math.min(hi, Math.max(lo, raw)) * 100) / 100
}

// YouTube's IFrame API accepts any rate on a 0.05 grid within 0.25–2, flooring off-grid values
// toward 0 (1.03 → 1, 1.234 → 1.2). Note getAvailablePlaybackRates() still reports only the old
// 8 coarse rates and is therefore ignored — probed against the live embed 2026-08-02.
export const YT_RATE_RANGE = { min: 0.25, max: 2, step: 0.05 } as const

// A native <video> accepts any playbackRate, so file loops get a finer slider.
export const FILE_RATE_RANGE = { min: 0.1, max: 2, step: 0.01 } as const

export interface Routine {
	id: string
	name: string
	exercises: Exercise[] // played top-to-bottom in sequence
}

export const SUBDIVISIONS: { key: Subdivision; label: string }[] = [
	{ key: 'quarter', label: '1/4' },
	{ key: 'eighth', label: '1/8' },
	{ key: 'sixteenth', label: '1/16' }
]

export const TICKS_PER_BEAT: Record<Subdivision, number> = {
	quarter: 1,
	eighth: 2,
	sixteenth: 4
}

export function makeExercise(index: number): Exercise {
	return {
		id: uid(),
		name: `Exercise ${index + 1}`,
		kind: 'metronome',
		durationSec: 300, // 5-minute default exercise timer
		timerEnabled: true,
		bpm: 100,
		subdivision: 'quarter',
		beatsPerMeasure: 4,
		accentBeats: [0]
	}
}

export function makeStep(): ExerciseStep {
	return { id: uid(), description: '', durationSec: 60, repeatCount: 1, restSec: 5, metronomeEnabled: false }
}

export function makeRoutine(index: number): Routine {
	return {
		id: uid(),
		name: `Routine ${index + 1}`,
		exercises: []
	}
}

export function makeFretboard(view: FretView): FretboardConfig {
	return {
		view,
		rootPc: 7, // G — sits mid-neck so movable shapes have room
		quality: 'major',
		scaleType: 'major',
		seventhType: 'maj7',
		rootString: view === 'scale' ? 5 : 6,
		includeNotes: true,
		includeSevenths: true,
		includeTriads: true,
		quizRootString: 'both',
		guessSec: 5,
		bpm: 80
	}
}

export function makeVideoLoop(index: number, startSec = 0, endSec = 10, rate = 1): VideoLoop {
	return {
		id: uid(),
		label: `Loop ${index + 1}`,
		startSec,
		endSec,
		rate
	}
}

// A freshly added video/audio source seeds one loop spanning the whole media. Its length isn't
// known until the player reports it, so it's stored as this sentinel and filled in by VideoLooper
// once the duration arrives. Only the add path ever writes it — an emptied loop list stays empty.
export const PENDING_LOOP_END = 0

// Move one exercise to another routine. `toRoutineId === null` appends a new routine to hold it;
// the create and the move happen in one pass so the two can't disagree about which list is current.
export function moveExerciseToRoutine(
	routines: Routine[],
	fromRoutineId: string,
	exerciseId: string,
	toRoutineId: string | null
): Routine[] {
	if (toRoutineId === fromRoutineId) return routines // same-routine "move" would delete the exercise
	const exercise = routines
		.find((r) => r.id === fromRoutineId)
		?.exercises.find((e) => e.id === exerciseId)
	if (!exercise) return routines
	const existing = toRoutineId ? routines.find((r) => r.id === toRoutineId) : undefined
	const dest = existing ?? makeRoutine(routines.length)
	return (existing ? routines : [...routines, dest]).map((r) =>
		r.id === fromRoutineId
			? { ...r, exercises: r.exercises.filter((e) => e.id !== exerciseId) }
			: r.id === dest.id
				? { ...r, exercises: [...r.exercises, exercise] }
				: r
	)
}
