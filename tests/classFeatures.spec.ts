import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ClassData } from '../src/lib/types/dndClass'
import { parseLevels } from '../src/lib/types/dndClass'
import { splitBlocks, renderInline } from '../src/lib/utils/markdown'

// Acceptance gate for the generated class data, mirroring tests/music.spec.ts: it asserts on what
// actually ships, not on a fixture. A fixture would only prove the parser handles markdown we wrote
// — it could never catch "the real Ranger file spells a heading differently and a feature vanished".
// Regenerate with `node scripts/build-class-data.mjs` if these fail after a source refresh.

const ROOT = join(import.meta.dirname, '..', 'src', 'lib', 'assets', 'data', 'dnd', 'classes')
const VERSIONS = ['2024', '2014'] as const

function load(version: string, slug: string): ClassData {
	return JSON.parse(readFileSync(join(ROOT, version, `${slug}.json`), 'utf8'))
}

const ALL = VERSIONS.flatMap((v) =>
	readdirSync(join(ROOT, v)).map((f) => load(v, f.replace('.json', '')))
)

test('both rulesets ship all twelve classes', () => {
	for (const v of VERSIONS) expect(readdirSync(join(ROOT, v))).toHaveLength(12)
	expect(ALL).toHaveLength(24)
})

test('every progression table is 20 rows, level 1 through 20 in order', () => {
	for (const c of ALL) {
		const tag = `${c.version}/${c.slug}`
		expect(c.progression.rows, tag).toHaveLength(20)
		expect(
			c.progression.rows.map((r) => parseInt(r[0], 10)),
			tag
		).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
		// Every row must have a cell for every column, or the level strip reads undefined.
		for (const row of c.progression.rows) expect(row.length, tag).toBe(c.progression.head.length)
	}
})

test('every feature is placed at real levels and belongs to a known subclass', () => {
	for (const c of ALL) {
		const tag = `${c.version}/${c.slug}`
		expect(c.features.length, tag).toBeGreaterThan(4)
		expect(c.subclassName, tag).not.toBe('')
		for (const f of c.features) {
			expect(f.levels.length, `${tag} ${f.name}`).toBeGreaterThan(0)
			expect(f.levels, `${tag} ${f.name}`).toEqual([...f.levels].sort((a, b) => a - b))
			for (const l of f.levels) {
				expect(Number.isInteger(l) && l >= 1 && l <= 20, `${tag} ${f.name} level ${l}`).toBe(true)
			}
			expect([null, c.subclassName], `${tag} ${f.name}`).toContain(f.subclass)
			expect(f.body.trim(), `${tag} ${f.name}`).not.toBe('')
		}
	}
})

// The 2014 join is the fragile half of the pipeline — feature headings there carry no level at all,
// so these are read off the printed PHB progressions rather than derived from the same code twice.
test('2014 levels match the printed progressions', () => {
	const at = (slug: string, name: string) => {
		const f = load('2014', slug).features.find((x) => x.name === name)
		expect(f, `2014/${slug} "${name}"`).toBeDefined()
		return f!.levels
	}
	expect(at('barbarian', 'Rage')).toEqual([1])
	expect(at('barbarian', 'Primal Path')).toEqual([3])
	expect(at('barbarian', 'Ability Score Improvement')).toEqual([4, 8, 12, 16, 19])
	expect(at('barbarian', 'Relentless Rage')).toEqual([11]) // table abbreviates this to "Relentless"
	expect(at('barbarian', 'Brutal Critical')).toEqual([9, 13, 17]) // "(1 die)"/"(2 dice)"/"(3 dice)"
	expect(at('fighter', 'Action Surge')).toEqual([2, 17])
	expect(at('fighter', 'Extra Attack')).toEqual([5, 11, 20])
	expect(at('fighter', 'Indomitable')).toEqual([9, 13, 17])
	expect(at('warlock', 'Mystic Arcanum')).toEqual([11, 13, 15, 17])
	expect(at('wizard', 'Signature Spells')).toEqual([20]) // table says the singular "Signature Spell"
	// "Aura improvements" at 18 advances both auras, not whichever the parser matched first.
	expect(at('paladin', 'Aura of Protection')).toEqual([6, 18])
	expect(at('paladin', 'Aura of Courage')).toEqual([10, 18])
	// Ranger's level 6 row is the compound "Favored Enemy and Natural Explorer improvements".
	expect(at('ranger', 'Favored Enemy')).toEqual([1, 6, 14])
	expect(at('ranger', 'Natural Explorer')).toEqual([1, 6, 10])
})

test('2014 subclass levels come from the feature prose', () => {
	const berserker = load('2014', 'barbarian').features.filter((f) => f.subclass)
	expect(berserker.map((f) => `${f.name} ${f.levels}`)).toEqual([
		'Frenzy 3',
		'Mindless Rage 6',
		'Intimidating Presence 10',
		'Retaliation 14'
	])
})

// Berserker is the easy case: all four of its features name their level in the opening sentence.
// These are the three shapes that don't, and each was wrong before it was pinned here.
test('2014 subclass features that state no level land on the subclass-choice level', () => {
	const at = (slug: string, name: string) =>
		load('2014', slug).features.find((f) => f.name === name && f.subclass)?.levels
	// "The Fiend lets you choose from an expanded list of spells" — no level at all. You pick a
	// Warlock patron at 1, not at 6, which is merely the first level the table says it improves.
	expect(at('warlock', 'Expanded Spell List')).toEqual([1])
	// Paladin takes the oath at 3; 7/15/20 are the "Oath feature" rows.
	expect(at('paladin', 'Tenets of Devotion')).toEqual([3])
	expect(at('paladin', 'Oath Spells')).toEqual([3])
	expect(at('paladin', 'Aura of Devotion')).toEqual([7]) // this one does state its level
})

test('an enumerated level list resolves to its first level', () => {
	// Circle Spells opens "At 3rd, 5th, 7th, and 9th level" — you gain it at 3, not 9.
	expect(load('2014', 'druid').features.find((f) => f.name === 'Circle Spells')?.levels).toEqual([3])
})

test('2024 headings supply the first level and the table supplies the repeats', () => {
	const at = (slug: string, name: string) =>
		load('2024', slug).features.find((x) => x.name === name)?.levels
	expect(at('barbarian', 'Rage')).toEqual([1])
	expect(at('barbarian', 'Ability Score Improvement')).toEqual([4, 8, 12, 16])
	expect(at('barbarian', 'Brutal Strike')).toEqual([9]) // 13 and 17 are "Improved Brutal Strike"
	expect(at('fighter', 'Action Surge')).toEqual([2, 17])
	expect(at('fighter', 'Indomitable')).toEqual([9, 13, 17])
})

test('the 2024 HTML tables survived conversion to pipe tables', () => {
	const druid = load('2024', 'druid')
	expect(druid.progression.head[0]).toBe('Level')
	// Core Traits is an HTML key/value table in the source; it becomes basics, not a feature.
	expect(druid.basics.map((b) => b.title)).toContain('Hit Point Die')
	// No raw HTML may reach the client — renderInline escapes it, so a leak shows as literal "<td>".
	for (const c of ALL) {
		for (const f of c.features) {
			expect(f.body, `${c.version}/${c.slug} ${f.name}`).not.toMatch(/<(table|tr|td|th)\b/)
		}
	}
})

// Selectable features. The detector is a heuristic over prose, so both what it catches and what it
// deliberately does not are pinned here.
test('features that are a choice carry their options', () => {
	const opts = (v: '2024' | '2014', slug: string, name: string) =>
		load(v, slug).features.find((f) => f.name === name)?.options?.map((o) => o.label)

	expect(opts('2014', 'fighter', 'Fighting Style')).toEqual([
		'Archery',
		'Defense',
		'Dueling',
		'Great Weapon Fighting',
		'Protection',
		'Two-Weapon Fighting'
	])
	expect(opts('2014', 'warlock', 'Pact Boon')).toEqual([
		'Pact of the Chain',
		'Pact of the Blade',
		'Pact of the Tome'
	])
	// A table whose rows are the choice, not sub-headed prose.
	expect(opts('2014', 'sorcerer', 'Dragon Ancestor')).toEqual([
		'Black', 'Blue', 'Brass', 'Bronze', 'Copper', 'Gold', 'Green', 'Red', 'Silver', 'White'
	])
	expect(opts('2024', 'druid', 'Circle of the Land Spells')).toEqual([
		'Arid Land', 'Polar Land', 'Temperate Land', 'Tropical Land'
	])
	expect(opts('2014', 'druid', 'Circle Spells')).toHaveLength(7)
	// 2024 parks these in their own "### X Options" section further down the class; without pulling
	// them back onto the feature they are dropped from the page entirely.
	expect(opts('2024', 'sorcerer', 'Metamagic')?.length).toBeGreaterThan(5)
	expect(opts('2024', 'warlock', 'Eldritch Invocations')?.length).toBeGreaterThan(20)
	// 2014 repeats the heading instead; the catalogue belongs to the level-2 feature, not to the
	// level-20 capstone that happens to precede it in the file.
	const warlock2014 = load('2014', 'warlock')
	expect(warlock2014.features.find((f) => f.name === 'Eldritch Invocations')?.levels).toEqual([2])
	expect(warlock2014.features.find((f) => f.name === 'Eldritch Master')?.options).toBeUndefined()
})

test('features that merely contain sub-sections are not turned into pickers', () => {
	const noOptions = (v: '2024' | '2014', slug: string, name: string) =>
		expect(load(v, slug).features.find((f) => f.name === name)?.options, `${v}/${slug} ${name}`)
			.toBeUndefined()
	// All of these have two or more bold sub-blocks but you get every one of them.
	noOptions('2014', 'bard', 'Spellcasting')
	noOptions('2014', 'monk', 'Ki')
	noOptions('2014', 'sorcerer', 'Font of Magic')
	// "Now you choose the Oath of Devotion…" — but its sub-blocks are Oath Spells and Channel
	// Divinity, which are not the things being chosen between.
	noOptions('2014', 'paladin', 'Sacred Oath')
})

test('every option has a label and a body', () => {
	for (const c of ALL) {
		for (const f of c.features) {
			if (!f.options) continue
			expect(f.options.length, `${c.version}/${c.slug} ${f.name}`).toBeGreaterThan(1)
			const labels = f.options.map((o) => o.label)
			expect(new Set(labels).size, `${c.version}/${c.slug} ${f.name} duplicate labels`).toBe(labels.length)
			for (const o of f.options) {
				expect(o.label.trim(), `${c.version}/${c.slug} ${f.name}`).not.toBe('')
				expect(o.body.trim(), `${c.version}/${c.slug} ${f.name} :: ${o.label}`).not.toBe('')
			}
		}
	}
})

// A hand-typed subclass goes straight into the same list as the generated ones, and everything
// downstream reads levels[0] — `ordered`, the group headings, the open-by-default check. A typo in
// the editor's levels field must not be able to produce a shape that breaks those.
test('hand-typed levels are clamped to a usable shape', () => {
	expect(parseLevels('3')).toEqual([3])
	expect(parseLevels('3, 6, 14')).toEqual([3, 6, 14])
	expect(parseLevels('14 6 3')).toEqual([3, 6, 14]) // sorted
	expect(parseLevels('3, 3, 3')).toEqual([3]) // deduped
	expect(parseLevels('0, 21, -4, 25')).toEqual([]) // out of range
	expect(parseLevels('abc')).toEqual([])
	expect(parseLevels('')).toEqual([])
	expect(parseLevels('2.5')).toEqual([]) // not an integer
	expect(parseLevels('0, 25, abc, 7, 3, 3')).toEqual([3, 7]) // the mixed-garbage case
})

test('splitBlocks separates paragraphs, bullets and tables', () => {
	const blocks = splitBlocks(
		'Intro line.\n\n- first\n- second\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nTrailing.'
	)
	expect(blocks.map((b) => b.type)).toEqual(['p', 'ul', 'table', 'p'])
	expect(blocks[1]).toEqual({ type: 'ul', items: ['first', 'second'] })
	expect(blocks[2]).toEqual({ type: 'table', head: ['A', 'B'], rows: [['1', '2']] })
})

test('splitBlocks does not mistake a stray pipe for a table', () => {
	// No |---| separator on the next line, so this is prose that happens to contain a pipe.
	expect(splitBlocks('a | b rolled badly').map((b) => b.type)).toEqual(['p'])
})

test('renderInline escapes before it emits tags', () => {
	expect(renderInline('5 < 6 & **bold** _em_')).toBe('5 &lt; 6 &amp; <strong>bold</strong> <em>em</em>')
	expect(renderInline('<script>alert(1)</script>')).not.toContain('<script>')
})
