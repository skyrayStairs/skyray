// Turns the committed SRD markdown in scripts/srd/ into one JSON per class per ruleset under
// src/lib/assets/data/dnd/classes/. Run it after editing the parser or refreshing the sources:
//
//   node scripts/build-class-data.mjs
//
// No network: the SRD markdown is committed, so the site build never depends on GitHub being up.
// Exits non-zero if any invariant below fails. There is deliberately no skip list — the 2014 level
// join is the fragile part of this pipeline, and an escape hatch is exactly how a broken join ships
// quietly. Gate 3 is a count, so excusing a name changes the count and still fails.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	parseClass2024,
	parseClass2014,
	splitClasses2024,
	levelsFromProgression,
	parseOrdinal,
	normalizeName
} from './classParser.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srd = join(root, 'scripts', 'srd')
const outDir = join(root, 'src', 'lib', 'assets', 'data', 'dnd', 'classes')

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']

const problems = []
const fail = (cls, msg) => problems.push(`${cls}: ${msg}`)

function check(data, extra = {}) {
	const { name, progression, features, subclassName } = data
	const tag = `${data.version}/${data.slug}`

	// 1 — every feature is placed at a real level
	for (const f of features) {
		if (!f.levels.length) fail(tag, `feature "${f.name}" has no level`)
		for (const l of f.levels) {
			if (!Number.isInteger(l) || l < 1 || l > 20) fail(tag, `feature "${f.name}" has level ${l}`)
		}
		if (f.subclass !== null && f.subclass !== subclassName) {
			fail(tag, `feature "${f.name}" claims subclass "${f.subclass}"`)
		}
	}
	if (progression.rows.length !== 20) fail(tag, `${progression.rows.length} progression rows, expected 20`)
	progression.rows.forEach((r, i) => {
		if (parseOrdinal(r[0]) !== i + 1) fail(tag, `progression row ${i} is level ${r[0]}`)
	})
	if (!subclassName) fail(tag, 'no subclass found')

	// 2 + 3 — the join covers the whole table. Resolution is exact name, or an alias the parser
	// recorded; the loose prefix matching that produced the alias is NOT repeated here, so a bad
	// alias shows up as a mismatch instead of being confirmed by the same fuzzy rule twice.
	const table = levelsFromProgression(progression)
	const base = features.filter((f) => f.subclass === null)
	const resolvedTo = new Map((extra.resolution ?? []).map((r) => [r.table, r.features]))
	const covered = new Set()
	for (const entry of table) {
		const names = resolvedTo.get(entry.display)
		if (!names?.length) {
			fail(tag, `progression names "${entry.display}" but no feature matches`)
			continue
		}
		for (const name of names) {
			const hit = base.find((f) => f.name === name)
			if (!hit) {
				fail(tag, `"${entry.display}" resolved to "${name}", which is not a feature`)
				continue
			}
			covered.add(hit.name)
			for (const l of entry.levels) {
				if (!hit.levels.includes(l)) fail(tag, `"${hit.name}" missing level ${l} (table says ${entry.levels.join(',')})`)
			}
		}
	}
	const namedByTable = new Set([...resolvedTo.values()].flat())
	if (covered.size !== namedByTable.size) {
		fail(tag, `${covered.size} features cover ${namedByTable.size} names the progression resolves to`)
	}

	// 4 — nothing the parser could not place
	for (const u of extra.unmatched ?? []) fail(tag, `heading "${u}" is in no progression row`)
	for (const o of extra.unresolvedTableNames ?? []) fail(tag, `progression name "${o}" has no heading`)

	return { tag, name, features: features.length, base: base.length, sub: features.length - base.length, subclassName }
}

const summaries = []

// ---- 2024 -------------------------------------------------------------------
const md2024 = readFileSync(join(srd, '2024-classes.md'), 'utf8')
for (const { name, md } of splitClasses2024(md2024)) {
	if (!CLASSES.includes(name)) continue
	const parsed = parseClass2024(md, name)
	summaries.push({ ...check(parsed.data, parsed), ...parsed })
}

// ---- 2014 -------------------------------------------------------------------
for (const name of CLASSES) {
	const md = readFileSync(join(srd, '2014', `${name}.md`), 'utf8')
	const parsed = parseClass2014(md, name)
	summaries.push({ ...check(parsed.data, parsed), ...parsed })
}

// ---- report + write ---------------------------------------------------------
// The alias and fold lines are the review moment: every place the parser had to guess prints here.
for (const s of summaries) {
	console.log(
		`${s.tag.padEnd(20)} ${String(s.base).padStart(2)} base + ${String(s.sub).padStart(2)} subclass  (${s.subclassName})`
	)
	for (const r of s.resolution.filter((r) => r.via !== 'exact')) {
		console.log(`${' '.repeat(22)}~ table "${r.table}" -> ${r.features.map((f) => `"${f}"`).join(', ') || '(nothing)'} (${r.via})`)
	}
	for (const f of s.folded) console.log(`${' '.repeat(22)}+ folded "${f}" into the preceding feature`)
	for (const o of s.optionGroups) {
		console.log(`${' '.repeat(22)}> "${o.feature}" is selectable: ${o.count} options (${o.via})`)
	}
	for (const f of s.fallbacks) {
		console.log(`${' '.repeat(22)}! "${f.name}" states no level; using the subclass-choice level ${f.level}`)
	}
}

if (problems.length) {
	console.error(`\n${problems.length} problem(s):`)
	for (const p of problems) console.error(`  ✗ ${p}`)
	process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
for (const s of summaries) {
	const dir = join(outDir, s.data.version)
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, `${s.data.slug}.json`), `${JSON.stringify(s.data, null, '\t')}\n`, 'utf8')
}

const written = ['2024', '2014'].map((v) => readdirSync(join(outDir, v)).length)
console.log(`\nWrote ${written[0]} × 2024 and ${written[1]} × 2014 class files to ${outDir}`)
