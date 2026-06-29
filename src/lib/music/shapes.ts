// Movable chord/scale grips for the fretboard, as fret offsets from the root fret. These are the
// only HAND-TYPED music data in the app — every position carries its intended interval, and
// shapes.test verifies that (open_pc + rootFret + offset) matches (rootPc + interval) for each.
//
// Strings are fully fretted (no open strings) so a shape is movable: absolute fret = rootFret + offset.

import { STRING_OPEN_PC, type StringNum } from './notes'
import type { ScaleType, SeventhType } from '$lib/types/guitar'

export const INTERVAL_SEMITONES: Record<string, number> = {
	R: 0,
	'2': 2,
	b3: 3,
	'3': 4,
	'4': 5,
	b5: 6,
	'5': 7,
	b6: 8,
	'6': 9,
	bb7: 9, // diminished 7th (enharmonic with a 6th)
	b7: 10,
	'7': 11
}

export interface ShapeOffset {
	string: StringNum
	fret: number // offset from the root fret
	interval: string
}
export interface Shape {
	rootString: StringNum
	offsets: ShapeOffset[]
}

export interface Position {
	string: StringNum
	fret: number
	interval: string
	role: 'root' | 'note'
}

// ---- Chords, 6th-string root (barre grips) ----
const MAJOR_6: Shape = {
	rootString: 6,
	offsets: [
		{ string: 6, fret: 0, interval: 'R' },
		{ string: 5, fret: 2, interval: '5' },
		{ string: 4, fret: 2, interval: 'R' },
		{ string: 3, fret: 1, interval: '3' },
		{ string: 2, fret: 0, interval: '5' },
		{ string: 1, fret: 0, interval: 'R' }
	]
}
const MINOR_6: Shape = {
	rootString: 6,
	offsets: [
		{ string: 6, fret: 0, interval: 'R' },
		{ string: 5, fret: 2, interval: '5' },
		{ string: 4, fret: 2, interval: 'R' },
		{ string: 3, fret: 0, interval: 'b3' },
		{ string: 2, fret: 0, interval: '5' },
		{ string: 1, fret: 0, interval: 'R' }
	]
}

// ---- 7th chords, 6th-string root (drop-3, strings 6-4-3-2) ----
const SEVENTH_6: Record<SeventhType, Shape> = {
	maj7: {
		rootString: 6,
		offsets: [
			{ string: 6, fret: 0, interval: 'R' },
			{ string: 4, fret: 1, interval: '7' },
			{ string: 3, fret: 1, interval: '3' },
			{ string: 2, fret: 0, interval: '5' }
		]
	},
	dom7: {
		rootString: 6,
		offsets: [
			{ string: 6, fret: 0, interval: 'R' },
			{ string: 4, fret: 0, interval: 'b7' },
			{ string: 3, fret: 1, interval: '3' },
			{ string: 2, fret: 0, interval: '5' }
		]
	},
	min7: {
		rootString: 6,
		offsets: [
			{ string: 6, fret: 0, interval: 'R' },
			{ string: 4, fret: 0, interval: 'b7' },
			{ string: 3, fret: 0, interval: 'b3' },
			{ string: 2, fret: 0, interval: '5' }
		]
	},
	min7b5: {
		rootString: 6,
		offsets: [
			{ string: 6, fret: 0, interval: 'R' },
			{ string: 4, fret: 0, interval: 'b7' },
			{ string: 3, fret: 0, interval: 'b3' },
			{ string: 2, fret: -1, interval: 'b5' }
		]
	},
	dim7: {
		rootString: 6,
		offsets: [
			{ string: 6, fret: 0, interval: 'R' },
			{ string: 4, fret: -1, interval: 'bb7' },
			{ string: 3, fret: 0, interval: 'b3' },
			{ string: 2, fret: -1, interval: 'b5' }
		]
	}
}

// ---- 7th chords, 5th-string root (drop-2, strings 5-4-3-2) ----
const SEVENTH_5: Record<SeventhType, Shape> = {
	maj7: {
		rootString: 5,
		offsets: [
			{ string: 5, fret: 0, interval: 'R' },
			{ string: 4, fret: 2, interval: '5' },
			{ string: 3, fret: 1, interval: '7' },
			{ string: 2, fret: 2, interval: '3' }
		]
	},
	dom7: {
		rootString: 5,
		offsets: [
			{ string: 5, fret: 0, interval: 'R' },
			{ string: 4, fret: 2, interval: '5' },
			{ string: 3, fret: 0, interval: 'b7' },
			{ string: 2, fret: 2, interval: '3' }
		]
	},
	min7: {
		rootString: 5,
		offsets: [
			{ string: 5, fret: 0, interval: 'R' },
			{ string: 4, fret: 2, interval: '5' },
			{ string: 3, fret: 0, interval: 'b7' },
			{ string: 2, fret: 1, interval: 'b3' }
		]
	},
	min7b5: {
		rootString: 5,
		offsets: [
			{ string: 5, fret: 0, interval: 'R' },
			{ string: 4, fret: 1, interval: 'b5' },
			{ string: 3, fret: 0, interval: 'b7' },
			{ string: 2, fret: 1, interval: 'b3' }
		]
	},
	dim7: {
		rootString: 5,
		offsets: [
			{ string: 5, fret: 0, interval: 'R' },
			{ string: 4, fret: 1, interval: 'b5' },
			{ string: 3, fret: -1, interval: 'bb7' },
			{ string: 2, fret: 1, interval: 'b3' }
		]
	}
}

// ---- Scales, 5th-string root (3-notes-per-string boxes) ----
const MAJOR_SCALE_5: Shape = {
	rootString: 5,
	offsets: [
		{ string: 6, fret: 0, interval: '5' },
		{ string: 6, fret: 2, interval: '6' },
		{ string: 6, fret: 4, interval: '7' },
		{ string: 5, fret: 0, interval: 'R' },
		{ string: 5, fret: 2, interval: '2' },
		{ string: 5, fret: 4, interval: '3' },
		{ string: 4, fret: 0, interval: '4' },
		{ string: 4, fret: 2, interval: '5' },
		{ string: 4, fret: 4, interval: '6' },
		{ string: 3, fret: 1, interval: '7' },
		{ string: 3, fret: 2, interval: 'R' },
		{ string: 3, fret: 4, interval: '2' },
		{ string: 2, fret: 2, interval: '3' },
		{ string: 2, fret: 3, interval: '4' },
		{ string: 2, fret: 5, interval: '5' },
		{ string: 1, fret: 2, interval: '6' },
		{ string: 1, fret: 4, interval: '7' },
		{ string: 1, fret: 5, interval: 'R' }
	]
}
const MINOR_SCALE_5: Shape = {
	rootString: 5,
	offsets: [
		{ string: 6, fret: 0, interval: '5' },
		{ string: 6, fret: 1, interval: 'b6' },
		{ string: 6, fret: 3, interval: 'b7' },
		{ string: 5, fret: 0, interval: 'R' },
		{ string: 5, fret: 2, interval: '2' },
		{ string: 5, fret: 3, interval: 'b3' },
		{ string: 4, fret: 0, interval: '4' },
		{ string: 4, fret: 2, interval: '5' },
		{ string: 4, fret: 3, interval: 'b6' },
		{ string: 3, fret: 0, interval: 'b7' },
		{ string: 3, fret: 2, interval: 'R' },
		{ string: 3, fret: 4, interval: '2' },
		{ string: 2, fret: 1, interval: 'b3' },
		{ string: 2, fret: 3, interval: '4' },
		{ string: 2, fret: 5, interval: '5' },
		{ string: 1, fret: 1, interval: 'b6' },
		{ string: 1, fret: 3, interval: 'b7' },
		{ string: 1, fret: 5, interval: 'R' }
	]
}

// ---- Pentatonic scales, 5th-string root (2-notes-per-string boxes) ----
const MIN_PENTA_5: Shape = {
	rootString: 5,
	offsets: [
		{ string: 6, fret: 0, interval: '5' },
		{ string: 6, fret: 3, interval: 'b7' },
		{ string: 5, fret: 0, interval: 'R' },
		{ string: 5, fret: 3, interval: 'b3' },
		{ string: 4, fret: 0, interval: '4' },
		{ string: 4, fret: 2, interval: '5' },
		{ string: 3, fret: 0, interval: 'b7' },
		{ string: 3, fret: 2, interval: 'R' },
		{ string: 2, fret: 1, interval: 'b3' },
		{ string: 2, fret: 3, interval: '4' },
		{ string: 1, fret: 0, interval: '5' },
		{ string: 1, fret: 3, interval: 'b7' }
	]
}
const MAJ_PENTA_5: Shape = {
	rootString: 5,
	offsets: [
		{ string: 6, fret: 0, interval: '5' },
		{ string: 6, fret: 2, interval: '6' },
		{ string: 5, fret: 0, interval: 'R' },
		{ string: 5, fret: 2, interval: '2' },
		{ string: 4, fret: -1, interval: '3' },
		{ string: 4, fret: 2, interval: '5' },
		{ string: 3, fret: -1, interval: '6' },
		{ string: 3, fret: 2, interval: 'R' },
		{ string: 2, fret: 0, interval: '2' },
		{ string: 2, fret: 2, interval: '3' },
		{ string: 1, fret: 0, interval: '5' },
		{ string: 1, fret: 2, interval: '6' }
	]
}

export function chordShape(quality: 'major' | 'minor'): Shape {
	return quality === 'major' ? MAJOR_6 : MINOR_6
}
export function scaleShape(type: ScaleType): Shape {
	switch (type) {
		case 'minor':
			return MINOR_SCALE_5
		case 'majPenta':
			return MAJ_PENTA_5
		case 'minPenta':
			return MIN_PENTA_5
		default:
			return MAJOR_SCALE_5
	}
}
export function seventhShape(type: SeventhType, rootString: 6 | 5): Shape {
	return (rootString === 6 ? SEVENTH_6 : SEVENTH_5)[type]
}

/** Lowest fret on a string whose note is the given pitch class. */
function lowestFret(string: StringNum, rootPc: number): number {
	return (((rootPc - STRING_OPEN_PC[string]) % 12) + 12) % 12
}

/** Place a movable shape at the given root pitch class → absolute board positions. */
export function placeShape(shape: Shape, rootPc: number): Position[] {
	const minOffset = Math.min(...shape.offsets.map((o) => o.fret))
	let rootFret = lowestFret(shape.rootString, rootPc)
	while (rootFret + minOffset < 0) rootFret += 12 // shapes with negative offsets need headroom
	return shape.offsets.map((o) => ({
		string: o.string,
		fret: rootFret + o.fret,
		interval: o.interval,
		role: o.interval === 'R' ? 'root' : 'note'
	}))
}

export const ALL_SHAPES: Shape[] = [
	MAJOR_6,
	MINOR_6,
	...Object.values(SEVENTH_6),
	...Object.values(SEVENTH_5),
	MAJOR_SCALE_5,
	MINOR_SCALE_5,
	MAJ_PENTA_5,
	MIN_PENTA_5
]
