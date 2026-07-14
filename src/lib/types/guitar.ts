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
}

export const DEFAULT_METRONOME: MetronomeParams = {
	bpm: 100,
	subdivision: 'quarter',
	beatsPerMeasure: 4,
	accentBeats: [0]
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
}

// Resolve a step's metronome params, filling any unset field from DEFAULT_METRONOME.
export function stepMetronome(step: ExerciseStep): MetronomeParams {
	return {
		bpm: step.bpm ?? DEFAULT_METRONOME.bpm,
		subdivision: step.subdivision ?? DEFAULT_METRONOME.subdivision,
		beatsPerMeasure: step.beatsPerMeasure ?? DEFAULT_METRONOME.beatsPerMeasure,
		accentBeats: step.accentBeats ?? DEFAULT_METRONOME.accentBeats
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
	rate: number // playback speed for this loop (YouTube snaps to YT_PLAYBACK_RATES)
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

// YouTube's IFrame API only honors these discrete rates; off-list values silently no-op.
export const YT_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

// A native <video> accepts any playbackRate, so file loops get a continuous slider.
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
