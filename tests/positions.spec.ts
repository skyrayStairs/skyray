import { test, expect } from '@playwright/test'
import { scaleLayout } from '../src/lib/music/positions'
import { INTERVAL_SEMITONES, scaleShape } from '../src/lib/music/shapes'
import { SCALE_TYPE_LABELS, type ScaleType } from '../src/lib/types/guitar'

const TYPES = SCALE_TYPE_LABELS.map((s) => s.key)
const sig = (notes: { string: number; fret: number }[]) =>
	notes.map((n) => `${n.string}:${n.fret}`).sort().join(' ')

/** the pitch-class set of a scale at a given root (independent of the layout code) */
function scalePcs(rootPc: number, type: ScaleType): Set<number> {
	const pcs = new Set<number>()
	for (const o of scaleShape(type).offsets) pcs.add((rootPc + INTERVAL_SEMITONES[o.interval]) % 12)
	return pcs
}

// pitch class of a fretted note (E A D G B E tuning)
const OPEN = { 6: 4, 5: 9, 4: 2, 3: 7, 2: 11, 1: 4 } as Record<number, number>
const pcAt = (string: number, fret: number) => (OPEN[string] + fret) % 12

test('every position note really is a scale tone, and positions exist (all roots, all scales)', () => {
	for (const type of TYPES) {
		for (let root = 0; root < 12; root++) {
			const pcs = scalePcs(root, type as ScaleType)
			const { positions } = scaleLayout(root, type as ScaleType)
			expect(positions.length, `${type} root${root} has positions`).toBeGreaterThan(0)
			for (const pos of positions)
				for (const n of pos.notes)
					expect(pcs.has(pcAt(n.string, n.fret)), `${type} root${root} s${n.string} f${n.fret}`).toBe(true)
		}
	}
})

test('adjacent positions overlap — they share notes (the connected-box property)', () => {
	for (const type of TYPES) {
		const { positions } = scaleLayout(7, type as ScaleType)
		for (let i = 0; i < positions.length - 1; i++) {
			const a = new Set(positions[i].notes.map((n) => `${n.string}:${n.fret}`))
			const shared = positions[i + 1].notes.filter((n) => a.has(`${n.string}:${n.fret}`))
			expect(shared.length, `${type} box ${i} & ${i + 1} share notes`).toBeGreaterThan(0)
		}
	}
})

// ---- exact shapes decoded from appliedguitartheory.com/scale/g-major-scale ----
const findBox = (root: number, type: ScaleType, lo: number, hi: number) =>
	scaleLayout(root, type).positions.find((p) => p.minFret === lo && p.maxFret === hi)

test('G major positions 1-5 match Applied Guitar Theory exactly', () => {
	const expected: Record<string, { string: number; fret: number }[]> = {
		'2-5': [
			{ string: 6, fret: 2 }, { string: 6, fret: 3 }, { string: 6, fret: 5 },
			{ string: 5, fret: 2 }, { string: 5, fret: 3 }, { string: 5, fret: 5 },
			{ string: 4, fret: 2 }, { string: 4, fret: 4 }, { string: 4, fret: 5 },
			{ string: 3, fret: 2 }, { string: 3, fret: 4 }, { string: 3, fret: 5 },
			{ string: 2, fret: 3 }, { string: 2, fret: 5 },
			{ string: 1, fret: 2 }, { string: 1, fret: 3 }, { string: 1, fret: 5 }
		],
		'4-8': [
			{ string: 6, fret: 5 }, { string: 6, fret: 7 }, { string: 6, fret: 8 },
			{ string: 5, fret: 5 }, { string: 5, fret: 7 },
			{ string: 4, fret: 4 }, { string: 4, fret: 5 }, { string: 4, fret: 7 },
			{ string: 3, fret: 4 }, { string: 3, fret: 5 }, { string: 3, fret: 7 },
			{ string: 2, fret: 5 }, { string: 2, fret: 7 }, { string: 2, fret: 8 },
			{ string: 1, fret: 5 }, { string: 1, fret: 7 }, { string: 1, fret: 8 }
		],
		'7-10': [
			{ string: 6, fret: 7 }, { string: 6, fret: 8 }, { string: 6, fret: 10 },
			{ string: 5, fret: 7 }, { string: 5, fret: 9 }, { string: 5, fret: 10 },
			{ string: 4, fret: 7 }, { string: 4, fret: 9 }, { string: 4, fret: 10 },
			{ string: 3, fret: 7 }, { string: 3, fret: 9 },
			{ string: 2, fret: 7 }, { string: 2, fret: 8 }, { string: 2, fret: 10 },
			{ string: 1, fret: 7 }, { string: 1, fret: 8 }, { string: 1, fret: 10 }
		],
		'8-13': [
			{ string: 6, fret: 8 }, { string: 6, fret: 10 }, { string: 6, fret: 12 },
			{ string: 5, fret: 9 }, { string: 5, fret: 10 }, { string: 5, fret: 12 },
			{ string: 4, fret: 9 }, { string: 4, fret: 10 }, { string: 4, fret: 12 },
			{ string: 3, fret: 9 }, { string: 3, fret: 11 }, { string: 3, fret: 12 },
			{ string: 2, fret: 10 }, { string: 2, fret: 12 }, { string: 2, fret: 13 },
			{ string: 1, fret: 10 }, { string: 1, fret: 12 }
		],
		'11-15': [
			{ string: 6, fret: 12 }, { string: 6, fret: 14 }, { string: 6, fret: 15 },
			{ string: 5, fret: 12 }, { string: 5, fret: 14 }, { string: 5, fret: 15 },
			{ string: 4, fret: 12 }, { string: 4, fret: 14 },
			{ string: 3, fret: 11 }, { string: 3, fret: 12 }, { string: 3, fret: 14 },
			{ string: 2, fret: 12 }, { string: 2, fret: 13 }, { string: 2, fret: 15 },
			{ string: 1, fret: 12 }, { string: 1, fret: 14 }, { string: 1, fret: 15 }
		]
	}
	for (const [span, notes] of Object.entries(expected)) {
		const [lo, hi] = span.split('-').map(Number)
		const box = findBox(7, 'major', lo, hi)
		expect(box, `G major box ${span} exists`).toBeTruthy()
		expect(sig(box!.notes), `G major box ${span}`).toBe(sig(notes))
	}
})

test('A minor reuses the major shapes via its relative major (C major)', () => {
	// A minor position 1 = C major position 1 (C root on 6th string fret 8) → frets 7–10
	const box = findBox(9, 'minor', 7, 10)
	expect(box, 'A minor box at frets 7–10 exists').toBeTruthy()
	// it must contain the A-minor root notes (A) and b3 (C)
	const roots = box!.notes.filter((n) => n.interval === 'R')
	expect(roots.length).toBeGreaterThan(0)
})

test('A minor pentatonic box 1 (root on 6th string fret 5) matches the canonical shape', () => {
	const box = scaleLayout(9, 'minPenta').positions.find((p) => p.minFret === 5 && p.maxFret === 8)
	expect(box, 'box at frets 5–8 exists').toBeTruthy()
	expect(sig(box!.notes)).toBe(
		sig([
			{ string: 6, fret: 5 }, { string: 6, fret: 8 },
			{ string: 5, fret: 5 }, { string: 5, fret: 7 },
			{ string: 4, fret: 5 }, { string: 4, fret: 7 },
			{ string: 3, fret: 5 }, { string: 3, fret: 7 },
			{ string: 2, fret: 5 }, { string: 2, fret: 8 },
			{ string: 1, fret: 5 }, { string: 1, fret: 8 }
		])
	)
})

test('F major: the 2nd-string fret-1 note (C) is actually played', () => {
	const { playOrder } = scaleLayout(5, 'major')
	expect(playOrder.some((p) => p.string === 2 && p.fret === 1)).toBe(true)
})

test('playOrder zone indices stay within the positions array', () => {
	for (const type of TYPES) {
		const { positions, playOrder } = scaleLayout(0, type as ScaleType)
		expect(playOrder.length).toBeGreaterThan(0)
		for (const p of playOrder) expect(p.zone).toBeLessThan(positions.length)
	}
})
