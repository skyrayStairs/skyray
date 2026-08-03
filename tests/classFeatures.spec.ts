import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ClassData } from '../src/lib/types/dndClass'
import {
	parseLevels,
	chooseCount,
	nextFolds,
	allowance,
	asiAt,
	asiTotals,
	setAsi
} from '../src/lib/types/dndClass'
import { splitBlocks, renderInline } from '../src/lib/utils/markdown'
import { subclassIndex } from '../src/lib/data/subclassIndex'

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

// The 2024 caster tables put a colspan="9" "Spell Slots per Spell Level" banner over a second header
// row of 1..9. Flattening every <th> in the table concatenated the two rows instead of merging them,
// which left the head six columns longer than the data and slid every slot label six columns off its
// own numbers. Column heads are how the page names a value, so a shifted head is a wrong answer.
test('a two-row 2024 header merges down onto its own columns', () => {
	for (const c of ALL) {
		const tag = `${c.version}/${c.slug}`
		// Every column must be named, or the level strip shows a bare number you would have to count
		// columns to identify. A trailing stray <th> in the 2024 Bard and Druid sources is trimmed.
		for (const h of c.progression.head) expect(h.trim(), tag).not.toBe('')
	}
	// The alignment itself: a full caster at 20th has 4/3/3/3/3/2/2/1/1 spell slots, and a half caster
	// 4/3/3/3/2. Both only line up under the 1..9 heads once the banner row stops shifting them.
	const slotsAt20 = (version: '2024' | '2014', slug: string) => {
		const c = load(version, slug)
		return c.progression.head
			.map((h, i) => (/^[1-9]$/.test(h) ? c.progression.rows[19][i] : null))
			.filter((s): s is string => s !== null)
	}
	expect(slotsAt20('2024', 'bard')).toEqual(['4', '3', '3', '3', '3', '2', '2', '1', '1'])
	expect(slotsAt20('2024', 'sorcerer')).toEqual(['4', '3', '3', '3', '3', '2', '2', '1', '1'])
	expect(slotsAt20('2024', 'paladin')).toEqual(['4', '3', '3', '3', '2'])
})

// The level strip folds the slot columns into one "Slots 4 / 3 / …" chip and leaves every other
// column its own labelled chip. It tells them apart by a head that is nothing but a level, so a
// column that starts or stops matching silently moves between the two — nine chips reading "1 4"
// is what buried the Sorcery Points chip in the first place.
test('only the spell-slot columns are headed by a bare level', () => {
	const SLOT_HEAD = /^\d+(st|nd|rd|th)?$/i
	const run = (n: number, suffixed: boolean) =>
		Array.from({ length: n }, (_, i) =>
			suffixed ? `${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'}` : `${i + 1}`
		)
	for (const c of ALL) {
		const tag = `${c.version}/${c.slug}`
		const slots = c.progression.head.filter((h) => SLOT_HEAD.test(h))
		const width = { 9: 9, 5: 5 }[slots.length] ?? 0
		// Full casters carry nine, half casters five, martials none. The Warlock is the exception that
		// proves the rule: its slots are "Spell Slots" and "Slot Level", so they stay ordinary chips.
		expect(slots, tag).toEqual(width ? run(width, c.version === '2014') : [])
		if (c.slug === 'warlock') expect(c.progression.head, tag).toContain('Slot Level')
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

// The page caps how many options a `choose` feature keeps, and blinks its outline until you have
// picked that many. Both read this, so an off-by-one here is a Battle Master who can hold ten
// maneuvers or a feature that blinks forever.
test('a choose allowance grows with level and starts at zero', () => {
	const bm = { choose: [3, 7, 10, 15].map((level, i) => ({ level, count: 3 + i * 2 })) }
	expect(bm.choose.map((s) => s.count)).toEqual([3, 5, 7, 9])
	expect(chooseCount(bm, 1)).toBe(0) // before the subclass exists
	expect(chooseCount(bm, 3)).toBe(3)
	expect(chooseCount(bm, 6)).toBe(3) // holds until the next step
	expect(chooseCount(bm, 7)).toBe(5)
	expect(chooseCount(bm, 20)).toBe(9)
	expect(chooseCount({}, 20)).toBe(0) // every feature that isn't a pick-N
})

// A folded box has to stay folded across a level-up, and the page re-renders `open` on every level
// change, so the only thing keeping it shut is an entry in this map. The no-op branch is the one
// that would regress silently: `toggle` fires for programmatic opens too, and a write there would
// churn localStorage on every render.
test('a hand-folded box outranks the level, and reopening it hands control back', () => {
	const k = '2014/fighter/Second Wind'
	const folded = nextFolds({}, k, false, true) // open by default, user folds it
	expect(folded[k]).toBe(false)
	expect(nextFolds(folded, k, false, true)).toBe(folded) // echoed toggle: same map, no rewrite
	expect(k in nextFolds(folded, k, true, true)).toBe(false) // reopened: back to following the level
	// A box that is shut only because you have not reached it yet stores nothing, so it still pops
	// open at the level you gain it.
	expect(nextFolds({}, k, false, false)).toEqual({})
	expect(nextFolds({}, k, true, false)[k]).toBe(true) // read ahead, and it stays read
})

// Every shipped feature with options now renders the same two-tab picker, so `allowance` decides how
// many boxes each one lets you tick. An allowance larger than the option list is a feature that
// blinks forever; a non-monotonic one is a level-up that silently takes a choice away.
test('every shipped options feature gets a workable allowance', () => {
	for (const c of ALL) {
		for (const f of c.features) {
			if (!f.options) continue
			const tag = `${c.version}/${c.slug} ${f.name}`
			const steps = allowance(c, f)
			// Devotion's two Channel Divinity options are granted together — no picker, no allowance.
			if (steps.length === 0) continue
			expect(steps.map((s) => s.level), tag).toEqual([...steps.map((s) => s.level)].sort((a, b) => a - b))
			for (let i = 1; i < steps.length; i++) {
				expect(steps[i].count, `${tag} step ${i}`).toBeGreaterThan(steps[i - 1].count)
			}
			expect(chooseCount({ choose: steps }, 20), tag).toBeLessThanOrEqual(f.options.length)
			expect(chooseCount({ choose: steps }, 20), tag).toBeGreaterThan(0)
			// You cannot owe a choice for a feature you have not gained yet.
			expect(chooseCount({ choose: steps }, f.levels[0] - 1), tag).toBe(0)
		}
	}
})

// The hand-typed outlines feed the same picker, and there the pick-one default is a trap: a Shepherd
// druid chooses a Spirit Totem every time they summon one, so hiding the two they didn't tick would
// be wrong. Pinning the list means new outline content with options has to make that call
// deliberately rather than inherit a default that happens to be wrong for it.
test('only outline features that are really a build choice render as a pick-one', () => {
	const pickOne: string[] = []
	for (const version of VERSIONS) {
		for (const [slug, subs] of Object.entries(subclassIndex(version))) {
			// Empty progression: an outline's allowance can never come from a column.
			const stub = { version, slug, progression: { head: [], rows: [] } }
			for (const s of subs) {
				for (const f of s.features) {
					if (!f.options) continue
					const steps = allowance(stub, { ...f, subclass: s.name, body: f.body ?? '' })
					if (steps.length) pickOne.push(`${version} ${slug} ${s.name} ${f.name} — keep ${chooseCount({ choose: steps }, 20)} of ${f.options.length}`)
				}
			}
		}
	}
	// The first three state their own `choose`. Divine Soul is the only one taking the pick-one
	// default, and it earns it — you pick one affinity at 1st level and keep it. Everything else with
	// options in the outlines is either granted whole or chosen fresh at each use, so it isn't here.
	expect(pickOne).toEqual([
		'2014 fighter Battle Master Combat Superiority — keep 9 of 23',
		'2014 fighter Arcane Archer Arcane Shot — keep 6 of 8',
		'2014 fighter Rune Knight Rune Carver — keep 5 of 6',
		'2014 sorcerer Divine Soul Divine Magic — keep 1 of 5'
	])
})

test('the sorcerer metamagic allowance follows its own ruleset', () => {
	const at = (version: '2014' | '2024', level: number) => {
		const c = load(version, 'sorcerer')
		return chooseCount({ choose: allowance(c, c.features.find((f) => f.name === 'Metamagic')!) }, level)
	}
	// 2014: two, then one more at 10th and at 17th. 2024: two, then two more at each.
	expect([at('2014', 2), at('2014', 3), at('2014', 10), at('2014', 17)]).toEqual([0, 2, 3, 4])
	expect([at('2024', 1), at('2024', 2), at('2024', 10), at('2024', 17)]).toEqual([0, 2, 4, 6])
})

test('the warlock invocation allowance is read off its own progression table', () => {
	for (const version of VERSIONS) {
		const c = load(version, 'warlock')
		const f = c.features.find((x) => x.name === 'Eldritch Invocations')!
		const col = c.progression.head.findIndex((h) => /invocation/i.test(h))
		expect(col, version).toBeGreaterThan(0)
		const steps = allowance(c, f)
		// Every level must agree with the table cell, not just the steps we happened to record.
		for (let level = 1; level <= 20; level++) {
			const cell = parseInt(c.progression.rows[level - 1][col], 10)
			expect(chooseCount({ choose: steps }, level), `${version} level ${level}`).toBe(
				Number.isInteger(cell) ? cell : 0
			)
		}
	}
})

test('an ability score improvement records two scores per level and totals them', () => {
	let e: string[] = []
	expect(asiAt(e, 4)).toEqual(['', ''])
	e = setAsi(e, 4, 0, 'STR')
	e = setAsi(e, 4, 1, 'DEX')
	e = setAsi(e, 12, 0, 'CON')
	e = setAsi(e, 12, 1, 'CON') // the same score twice is the +2 form
	expect(asiAt(e, 4)).toEqual(['STR', 'DEX'])
	expect(asiAt(e, 8)).toEqual(['', '']) // a level you have not filled in
	expect(asiTotals(e)).toEqual([
		{ ability: 'STR', bonus: 1 },
		{ ability: 'DEX', bonus: 1 },
		{ ability: 'CON', bonus: 2 }
	])
	// Level 1 must not be read out of level 12's entry.
	expect(asiAt(setAsi([], 12, 0, 'WIS'), 1)).toEqual(['', ''])
	// Clearing both slots drops the row rather than storing it blank.
	e = setAsi(setAsi(e, 4, 0, ''), 4, 1, '')
	expect(e.some((x) => x.startsWith('4|'))).toBe(false)
	expect(asiTotals(e)).toEqual([{ ability: 'CON', bonus: 2 }])
})

test('every choose feature has enough options to fill its allowance', () => {
	const problems: string[] = []
	const seen: string[] = []
	for (const version of VERSIONS) {
		for (const [slug, subs] of Object.entries(subclassIndex(version))) {
			for (const sub of subs) {
				for (const f of sub.features) {
					if (!f.choose) continue
					const tag = `${version}/${slug} ${sub.name} :: ${f.name}`
					seen.push(f.name)
					const max = chooseCount(f, 20)
					if (!f.options) problems.push(`${tag} has choose but no options`)
					else if (f.options.length < max) problems.push(`${tag} keeps ${max} of ${f.options.length}`)
					// The allowance can only grow, and only on a level the feature is actually gained at.
					const steps = f.choose.map((s) => s.level)
					if (steps.some((l) => !f.levels.includes(l))) problems.push(`${tag} grows on a level it lacks`)
					if (JSON.stringify(steps) !== JSON.stringify([...steps].sort((a, b) => a - b))) {
						problems.push(`${tag} steps out of order`)
					}
				}
			}
		}
	}
	expect(problems.join('\n')).toBe('')
	// Otherwise a rename upstream turns this into a loop over nothing that still passes.
	expect(seen).toContain('Combat Superiority')
	expect(seen).toContain('Arcane Shot')
	expect(seen).toContain('Rune Carver')
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
