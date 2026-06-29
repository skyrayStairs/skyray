import { test, expect } from '@playwright/test'
import { ALL_SHAPES, placeShape, INTERVAL_SEMITONES } from '../src/lib/music/shapes'
import { noteAt, naturalsOnString } from '../src/lib/music/notes'

// Acceptance gate for the hand-typed grips: every position's actual pitch class (computed from
// tuning) must equal root + its tagged interval, for all 12 roots. A mistyped fret offset fails.
test('every grip position matches its tagged interval across all roots', () => {
	for (const shape of ALL_SHAPES) {
		for (let rootPc = 0; rootPc < 12; rootPc++) {
			for (const pos of placeShape(shape, rootPc)) {
				const semis = INTERVAL_SEMITONES[pos.interval]
				expect(semis, `unknown interval ${pos.interval}`).not.toBeUndefined()
				const expected = (rootPc + semis) % 12
				expect(
					noteAt(pos.string, pos.fret).pc,
					`root=${rootPc} s${pos.string} f${pos.fret} ${pos.interval}`
				).toBe(expected)
			}
		}
	}
})

test('note map matches known natural positions (6th & 5th strings)', () => {
	const seq = (s: 6 | 5) => naturalsOnString(s).map((n) => `${n.name}${n.fret}`).join(' ')
	expect(seq(6)).toBe('E0 F1 G3 A5 B7 C8 D10 E12')
	expect(seq(5)).toBe('A0 B2 C3 D5 E7 F8 G10 A12')
})

test('placeShape positions a 6th-string-root G chord at fret 3', () => {
	const major = ALL_SHAPES[0] // MAJOR_6
	const root = placeShape(major, 7).find((p) => p.string === 6)
	expect(root?.fret).toBe(3) // G on the low E string
})
