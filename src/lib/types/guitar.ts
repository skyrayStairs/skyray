// Data model for the Guitar Routine page.
//
// A Routine is an ordered list of Exercises played in sequence. Each Exercise has a
// countdown timer plus its own metronome settings.

export type Subdivision = 'quarter' | 'eighth' | 'sixteenth' // ticks per beat = 1 | 2 | 4

export interface Exercise {
	id: string
	name: string // custom, user-editable
	durationSec: number // stored as seconds; edited in the UI as mm:ss
	bpm: number
	subdivision: Subdivision // how often the metronome ticks
	beatsPerMeasure: number // measure length (time-signature numerator)
	accentBeats: number[] // 0-based beat indices that are "on beat" (louder tick)
	video?: VideoConfig // when present, this is a video-loop exercise (no metronome/timer)
	fretboard?: FretboardConfig // when present, this is a fretboard exercise (no metronome/timer)
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
	guessSec?: number // quiz: time to guess before reveal
	bpm?: number // scale: playback tempo
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
}

export type VideoSource =
	| { kind: 'youtube'; videoId: string }
	| { kind: 'file'; fileId: string; fileName: string } // bytes stored in IndexedDB under fileId

export interface VideoConfig {
	source: VideoSource
	loops: VideoLoop[]
	preservesPitch?: boolean // local-file only; default true (slow down without pitch shift)
	// Shared single-active flag: at most one loop is "active" (its A-B region loops). When null
	// the video plays through normally and loops back to the start when it finishes.
	activeLoopId?: string | null
}

// YouTube's IFrame API only honors these discrete rates; off-list values silently no-op.
export const YT_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

// A native <video> accepts any playbackRate, so file loops get a continuous slider.
export const FILE_RATE_RANGE = { min: 0.1, max: 2, step: 0.05 } as const

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
		id: crypto.randomUUID(),
		name: `Exercise ${index + 1}`,
		durationSec: 60,
		bpm: 100,
		subdivision: 'quarter',
		beatsPerMeasure: 4,
		accentBeats: [0]
	}
}

export function makeRoutine(index: number): Routine {
	return {
		id: crypto.randomUUID(),
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
		guessSec: 5,
		bpm: 80
	}
}

export function makeVideoLoop(index: number, startSec = 0, endSec = 10, rate = 1): VideoLoop {
	return {
		id: crypto.randomUUID(),
		label: `Loop ${index + 1}`,
		startSec,
		endSec,
		rate
	}
}
