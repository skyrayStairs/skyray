// Scale position boxes across the neck.
//
// Diatonic scales (major / natural minor) use the 5 CAGED positions exactly as charted on
// appliedguitartheory.com — hand-encoded below as movable shapes (fret offsets from the major
// root on the 6th string, intervals computed from pitch). A natural-minor scale reuses the same
// shapes anchored at its relative major (root + 3 semitones), so its notes are correct and its
// boxes line up with AGT's minor charts. Pentatonic scales use their 5 classic boxes, generated
// from the connected 2-notes-per-string skeleton. positions.spec asserts the shapes vs AGT.

import { STRING_OPEN_PC, midiAt, type StringNum } from './notes'
import { INTERVAL_SEMITONES, scaleShape } from './shapes'
import type { ScaleType } from '$lib/types/guitar'

export interface PosNote {
	string: StringNum
	fret: number
	interval: string
}
export interface ScalePosition {
	notes: PosNote[]
	minFret: number
	maxFret: number
	center: number // mid fret, for "nearest position to a click" picking
}
export interface PlayNote {
	string: StringNum
	fret: number
	zone: number // index into positions[]
}
export interface ScaleLayout {
	markers: (PosNote & { role: 'root' | 'note' })[] // every scale tone on the displayed neck
	positions: ScalePosition[]
	playOrder: PlayNote[] // each box low→high then high→low, boxes in order
}

const STRINGS: StringNum[] = [6, 5, 4, 3, 2, 1]
const mod = (n: number, m: number) => ((n % m) + m) % m

// semitones-above-root → interval label (covers major + natural minor degrees)
const SEMI_LABEL: Record<number, string> = {
	0: 'R', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7'
}

// The 5 CAGED major-scale positions (appliedguitartheory.com), as { string, offset-from-6th-string-
// -major-root } per note. For G major the 6th-string root (G) is fret 3, so e.g. position 1 spans
// frets 2–5. Movable: the same offsets give the right degrees at any root.
type ShapeOffset = { string: StringNum; offset: number }
const off = (string: StringNum, ...offsets: number[]): ShapeOffset[] => offsets.map((offset) => ({ string, offset }))
const MAJOR_POSITIONS: ShapeOffset[][] = [
	// position 1 (frets 2–5 for G)
	[...off(6, -1, 0, 2), ...off(5, -1, 0, 2), ...off(4, -1, 1, 2), ...off(3, -1, 1, 2), ...off(2, 0, 2), ...off(1, -1, 0, 2)],
	// position 2 (frets 4–8)
	[...off(6, 2, 4, 5), ...off(5, 2, 4), ...off(4, 1, 2, 4), ...off(3, 1, 2, 4), ...off(2, 2, 4, 5), ...off(1, 2, 4, 5)],
	// position 3 (frets 7–10)
	[...off(6, 4, 5, 7), ...off(5, 4, 6, 7), ...off(4, 4, 6, 7), ...off(3, 4, 6), ...off(2, 4, 5, 7), ...off(1, 4, 5, 7)],
	// position 4 (frets 8–13)
	[...off(6, 5, 7, 9), ...off(5, 6, 7, 9), ...off(4, 6, 7, 9), ...off(3, 6, 8, 9), ...off(2, 7, 9, 10), ...off(1, 7, 9)],
	// position 5 (frets 11–15)
	[...off(6, 9, 11, 12), ...off(5, 9, 11, 12), ...off(4, 9, 11), ...off(3, 8, 9, 11), ...off(2, 9, 10, 12), ...off(1, 9, 11, 12)]
]

/** pitch class → interval label for the scale rooted at rootPc (degrees from the movable shape). */
function degreeMap(rootPc: number, type: ScaleType): Map<number, string> {
	const m = new Map<number, string>()
	for (const o of scaleShape(type).offsets) {
		const semi = INTERVAL_SEMITONES[o.interval]
		if (semi != null) m.set((rootPc + semi) % 12, o.interval)
	}
	return m
}

/** Ascending scale tones on one string within 0..maxScan, each tagged with its interval. */
function stringScale(string: StringNum, degrees: Map<number, string>, maxScan: number): PosNote[] {
	const out: PosNote[] = []
	for (let f = 0; f <= maxScan; f++) {
		const iv = degrees.get((STRING_OPEN_PC[string] + f) % 12)
		if (iv) out.push({ string, fret: f, interval: iv })
	}
	return out
}

/** The 5 CAGED diatonic boxes placed up the neck (major directly; minor via its relative major). */
function diatonicPositions(rootPc: number, type: ScaleType, maxFret: number): ScalePosition[] {
	const majorRoot = type === 'minor' ? (rootPc + 3) % 12 : rootPc
	const root6 = mod(majorRoot - STRING_OPEN_PC[6], 12) // lowest fret of the major root on the 6th string
	const seen = new Set<string>()
	const out: ScalePosition[] = []
	for (let oct = -1; oct <= 2; oct++) {
		const anchor = root6 + 12 * oct
		for (const shape of MAJOR_POSITIONS) {
			const notes: PosNote[] = []
			let ok = true
			for (const sp of shape) {
				const fret = anchor + sp.offset
				if (fret < 0 || fret > maxFret) {
					ok = false // box runs off the displayed neck — drop it (it reappears an octave over)
					break
				}
				const pc = mod(STRING_OPEN_PC[sp.string] + fret, 12)
				notes.push({ string: sp.string, fret, interval: SEMI_LABEL[mod(pc - rootPc, 12)] })
			}
			if (!ok) continue
			const key = notes.map((n) => `${n.string}:${n.fret}`).join('|')
			if (seen.has(key)) continue
			seen.add(key)
			const frets = notes.map((n) => n.fret)
			const minFret = Math.min(...frets)
			const maxF = Math.max(...frets)
			out.push({ notes, minFret, maxFret: maxF, center: (minFret + maxF) / 2 })
		}
	}
	return out.sort((a, b) => a.minFret - b.minFret)
}

/** The 5 pentatonic boxes: a connected 2-notes-per-string skeleton, each box's window filled. */
function pentatonicPositions(rootPc: number, type: ScaleType, maxFret: number): ScalePosition[] {
	const degrees = degreeMap(rootPc, type)
	const scan = maxFret + 7
	const out: ScalePosition[] = []
	for (const start of stringScale(6, degrees, maxFret)) {
		let boxMin = Infinity
		let boxMax = -Infinity
		let prevTop = -Infinity
		let ok = true
		for (const s of STRINGS) {
			const sf = stringScale(s, degrees, scan)
			const idx =
				s === 6 ? sf.findIndex((n) => n.fret === start.fret) : sf.findIndex((n) => midiAt(s, n.fret) > prevTop)
			if (idx < 0 || idx + 2 > sf.length) {
				ok = false
				break
			}
			const pair = sf.slice(idx, idx + 2)
			boxMin = Math.min(boxMin, pair[0].fret)
			boxMax = Math.max(boxMax, pair[1].fret)
			prevTop = midiAt(s, pair[1].fret)
		}
		if (!ok || boxMax > maxFret) continue
		const notes: PosNote[] = []
		for (const s of STRINGS) for (const n of stringScale(s, degrees, boxMax)) if (n.fret >= boxMin) notes.push(n)
		out.push({ notes, minFret: boxMin, maxFret: boxMax, center: (boxMin + boxMax) / 2 })
	}
	return out
}

export function scaleLayout(rootPc: number, type: ScaleType, maxFret = 17): ScaleLayout {
	const positions =
		type === 'major' || type === 'minor'
			? diatonicPositions(rootPc, type, maxFret)
			: pentatonicPositions(rootPc, type, maxFret)

	// draw the scale map only across the range the boxes cover, so no dots dangle past them
	const lo = positions.length ? Math.min(...positions.map((p) => p.minFret)) : 0
	const hi = positions.length ? Math.max(...positions.map((p) => p.maxFret)) : maxFret
	const degrees = degreeMap(rootPc, type)
	const markers = STRINGS.flatMap((s) =>
		stringScale(s, degrees, hi)
			.filter((n) => n.fret >= lo)
			.map((n) => ({
				...n,
				role: (n.interval === 'R' ? 'root' : 'note') as 'root' | 'note'
			}))
	)

	const playOrder: PlayNote[] = []
	positions.forEach((pos, zone) => {
		const box = [...pos.notes].sort((a, b) => midiAt(a.string, a.fret) - midiAt(b.string, b.fret))
		for (let i = 0; i < box.length; i++) playOrder.push({ string: box[i].string, fret: box[i].fret, zone })
		for (let i = box.length - 2; i >= 1; i--) playOrder.push({ string: box[i].string, fret: box[i].fret, zone })
	})

	return { markers, positions, playOrder }
}
