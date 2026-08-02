import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ClassData } from '../src/lib/types/dndClass'
import { CLASS_SLUGS } from '../src/lib/types/dndClass'
import { SUBCLASSES_2014, SUBCLASSES_2024 } from '../src/lib/data/subclassIndex'

// src/lib/data/subclassIndex.ts is the one piece of D&D data in this repo that is NOT derived from a
// source document — it's the structural outline of every PHB subclass, written from knowledge. There
// is no build gate that can check it against a book.
//
// What CAN be checked: each ruleset's SRD ships exactly one of those subclasses with its real
// feature names and levels, generated from the SRD markdown. Twelve of the eighty-eight entries can
// therefore be verified exactly. That is not proof the other seventy-six are right, but a systematic
// error — wrong level convention, wrong naming style, a whole ruleset's levels shifted — shows up
// here rather than at the table.

const ROOT = join(import.meta.dirname, '..', 'src', 'lib', 'assets', 'data', 'dnd', 'classes')
const load = (version: string, slug: string): ClassData =>
	JSON.parse(readFileSync(join(ROOT, version, `${slug}.json`), 'utf8'))

const INDEXES = [
	['2014', SUBCLASSES_2014],
	['2024', SUBCLASSES_2024]
] as const

test('the index covers every class in both rulesets', () => {
	for (const [version, index] of INDEXES) {
		expect(Object.keys(index).sort(), version).toEqual([...CLASS_SLUGS].sort())
		for (const slug of CLASS_SLUGS) {
			expect(index[slug].length, `${version}/${slug}`).toBeGreaterThan(0)
		}
	}
})

test('the 2024 PHB ships four subclasses per class', () => {
	for (const slug of CLASS_SLUGS) {
		expect(SUBCLASSES_2024[slug].length, slug).toBe(4)
	}
})

test('every outline is structurally usable', () => {
	for (const [version, index] of INDEXES) {
		for (const slug of CLASS_SLUGS) {
			const names = index[slug].map((s) => s.name)
			expect(new Set(names).size, `${version}/${slug} duplicate subclass names`).toBe(names.length)

			for (const sub of index[slug]) {
				const tag = `${version}/${slug} ${sub.name}`
				expect(sub.name.trim(), tag).not.toBe('')
				expect(sub.features.length, tag).toBeGreaterThan(1)
				for (const f of sub.features) {
					expect(f.name.trim(), tag).not.toBe('')
					// A stray leading "." or trailing space is the kind of typo that survives review.
					expect(f.name, `${tag} :: ${f.name}`).toMatch(/^[A-Z0-9]/)
					expect(f.levels.length, `${tag} :: ${f.name}`).toBeGreaterThan(0)
					expect(f.levels, `${tag} :: ${f.name}`).toEqual([...f.levels].sort((a, b) => a - b))
					for (const l of f.levels) {
						expect(Number.isInteger(l) && l >= 1 && l <= 20, `${tag} :: ${f.name} level ${l}`).toBe(true)
					}
				}
				// Features must be listed in level order — the page sorts, but out-of-order entries in
				// the source are a sign the whole outline was typed from a bad memory of the table.
				const firsts = sub.features.map((f) => f.levels[0])
				expect(firsts, `${tag} feature order`).toEqual([...firsts].sort((a, b) => a - b))
			}
		}
	}
})

// The real check: the twelve SRD subclasses exist in both the generated data and the hand-written
// index, so they must agree exactly.
test('SRD subclasses in the index match the generated SRD data exactly', () => {
	const mismatches: string[] = []

	for (const [version, index] of INDEXES) {
		for (const slug of CLASS_SLUGS) {
			const data = load(version, slug)
			const outline = index[slug].find((s) => s.name === data.subclassName)
			if (!outline) {
				mismatches.push(
					`${version}/${slug}: index has no "${data.subclassName}" (has ${index[slug].map((s) => s.name).join(', ')})`
				)
				continue
			}

			const actual = data.features
				.filter((f) => f.subclass !== null)
				.map((f) => `${f.name} @${f.levels.join('/')}`)
				.sort()
			const claimed = outline.features.map((f) => `${f.name} @${f.levels.join('/')}`).sort()

			if (JSON.stringify(actual) !== JSON.stringify(claimed)) {
				mismatches.push(`${version}/${slug} ${data.subclassName}:\n  SRD   ${actual.join('\n  SRD   ')}\n  index ${claimed.join('\n  index ')}`)
			}
		}
	}

	expect(mismatches.join('\n\n')).toBe('')
})
