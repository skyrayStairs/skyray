// Parsers for the two SRD class corpora. They are structured differently enough that a single
// runtime parser would be worse than this build step:
//
//   SRD 5.2.1 (2024) — one 298KB file. Every feature heading carries its level ("#### Level 9:
//   Brutal Strike"). Every table is raw HTML <table>, not GFM.
//   SRD 5.1 (2014)  — twelve files. Feature headings are flat and carry NO level; the level only
//   exists in the progression table's Features column, and the names there don't always match the
//   headings ("Relentless" vs "### Relentless Rage").
//
// Both paths converge on the same ClassData shape (src/lib/types/dndClass.ts). HTML tables are
// converted to GFM here so the client has exactly one table syntax to render.

// ---------------------------------------------------------------- text helpers

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

function decode(s) {
	return s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
}

/** Strip inline tags, decode entities, collapse whitespace. Cell text only — never whole documents. */
function cellText(html) {
	return decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

export function slugify(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** "3rd" | "3" | "Level 3" -> 3. Returns NaN when there's no leading number. */
export function parseOrdinal(s) {
	const m = String(s).match(/(\d{1,2})/)
	return m ? Number(m[1]) : NaN
}

/**
 * Match key for joining a progression-table entry to a feature heading. Trailing parentheticals
 * carry the per-level detail ("Brutal Critical (2 dice)", "Mystic Arcanum (6th level)") and must
 * not split one heading into several features.
 */
export function normalizeName(s) {
	return s
		.replace(/\([^)]*\)\s*$/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

/** Table cells that name a subclass slot rather than a feature: "Path feature", "Domain feature". */
function isPlaceholder(name) {
	return /\bfeatures?$/i.test(name.trim())
}

// ---------------------------------------------------------------- tables

function toPipe({ head, rows }) {
	const width = Math.max(head.length, ...rows.map((r) => r.length))
	const pad = (r) => Array.from({ length: width }, (_, i) => (r[i] ?? '').replace(/\|/g, '\\|'))
	return [
		`| ${pad(head).join(' | ')} |`,
		`| ${Array(width).fill('---').join(' | ')} |`,
		...rows.map((r) => `| ${pad(r).join(' | ')} |`)
	].join('\n')
}

/**
 * Rewrite every <table> in the text as a GFM pipe table, returning the parsed tables in document
 * order alongside. The 2024 corpus contains only table markup — no other HTML — so this is the
 * whole HTML story.
 */
export function htmlTablesToPipe(text) {
	const tables = []
	const out = text.replace(/<table>[\s\S]*?<\/table>/g, (block) => {
		const head = [...block.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((m) => cellText(m[1]))
		const rows = []
		for (const tr of block.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
			const cells = [...tr[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1]))
			if (cells.length) rows.push(cells)
		}
		const t = { head, rows }
		tables.push(t)
		return toPipe(t)
	})
	return { text: out, tables }
}

const PIPE_ROW = /^\s*\|.*\|\s*$/
const PIPE_SEP = /^\s*\|[\s:|-]+\|\s*$/

function splitCells(line) {
	return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
}

/** Find the first GFM table whose first header cell is "Level" — i.e. the class progression. */
function findProgression(text) {
	const lines = text.split('\n')
	for (let i = 0; i < lines.length - 1; i++) {
		if (!PIPE_ROW.test(lines[i]) || !PIPE_SEP.test(lines[i + 1])) continue
		const head = splitCells(lines[i])
		if (head[0]?.toLowerCase() !== 'level') continue
		const rows = []
		let j = i + 2
		for (; j < lines.length && PIPE_ROW.test(lines[j]); j++) {
			const cells = splitCells(lines[j])
			if (cells.some((c) => c !== '')) rows.push(cells) // the 2014 tables end on a blank row
		}
		return { head, rows, start: i, end: j }
	}
	return null
}

/** Index of the Features column, which sits in a different position in almost every class. */
function featuresColumn(head) {
	const i = head.findIndex((h) => /^(class )?features$/i.test(h))
	if (i < 0) throw new Error(`no Features column in [${head.join(' | ')}]`)
	return i
}

/**
 * Every distinct thing the progression's Features column names, with the levels it appears at.
 *
 * Each entry keeps a list of candidate names in falling priority. The extra candidates exist for
 * the "you get better at something you already have" rows, which the 2014 tables spell three ways
 * and none of which is a new feature: "Wild Shape improvement", "Aura improvements", and the
 * compound "Favored Enemy and Natural Explorer improvements". The literal cell text is always tried
 * first, so a feature genuinely *named* Improvement ("Ability Score Improvement") is unaffected.
 */
export function levelsFromProgression(progression) {
	const col = featuresColumn(progression.head)
	const byDisplay = new Map()
	for (const row of progression.rows) {
		const level = parseOrdinal(row[0])
		if (!Number.isFinite(level)) continue
		for (const raw of (row[col] ?? '').split(',')) {
			const display = raw.trim()
			if (!display || display === '—' || display === '-' || isPlaceholder(display)) continue
			if (!byDisplay.has(display)) {
				const names = [display]
				const improved = /\s+improvements?$/i.test(display)
				if (improved) {
					// Only a trailing "improvements" licenses splitting on "and".
					for (const p of display.replace(/\s+improvements?$/i, '').split(/\s+and\s+/)) {
						if (p.trim()) names.push(p.trim())
					}
				}
				byDisplay.set(display, { display, names, improved, levels: [] })
			}
			const e = byDisplay.get(display)
			if (!e.levels.includes(level)) e.levels.push(level)
		}
	}
	const out = [...byDisplay.values()]
	for (const e of out) e.levels.sort((a, b) => a - b)
	return out
}

const depluralize = (k) => k.replace(/s$/, '')

/**
 * Attach progression levels to already-parsed features, in three passes of falling confidence, and
 * return how every entry resolved. Non-exact decisions print at build time and are re-checked by
 * name in the gate rather than by repeating the fuzzy rule — so a wrong guess surfaces as a
 * mismatch instead of being confirmed twice by the same logic.
 *
 * Runs for BOTH rulesets. In 2024 the headings already carry the level a feature first appears and
 * the table supplies the repeats ("Ability Score Improvement" is one heading, five levels); in 2014
 * the table is the only source of levels at all.
 */
export function joinProgression(features, progression) {
	const entries = levelsFromProgression(progression)
	const resolution = []
	const claimed = new Set()
	const keyOf = (f) => normalizeName(f.name)

	const attach = (hits, entry, via) => {
		for (const f of hits) {
			claimed.add(f)
			for (const l of entry.levels) if (!f.levels.includes(l)) f.levels.push(l)
			f.levels.sort((a, b) => a - b)
		}
		resolution.push({ table: entry.display, features: hits.map((f) => f.name), via })
	}

	/**
	 * @param allowClaimed an improvement row is by definition about a feature you already have, so
	 *   it may land on one another row already claimed; a literal row may not, or "Spellcasting"
	 *   would swallow "Spellcasting Ability".
	 * @param allowMany likewise, only an improvement row may cover several features at once.
	 */
	const match = (name, { allowClaimed, allowMany }) => {
		const key = normalizeName(name)
		const open = (f) => allowClaimed || !claimed.has(f)

		const exact = features.filter((f) => keyOf(f) === key)
		if (exact.length) return { hits: exact.slice(0, 1), via: 'exact' }
		// "Signature Spell" in the table, "### Signature Spells" as the heading.
		const plural = features.filter((f) => open(f) && depluralize(keyOf(f)) === depluralize(key))
		if (plural.length === 1) return { hits: plural, via: 'plural' }
		// The table abbreviates the heading: "Relentless" for "### Relentless Rage".
		const prefix = features.filter((f) => open(f) && keyOf(f).startsWith(`${key} `))
		if (prefix.length === 1 || (allowMany && prefix.length > 1)) return { hits: prefix, via: 'prefix' }
		return null
	}

	for (const entry of entries) {
		// 1 — the cell text as written
		const direct = match(entry.names[0], { allowClaimed: false, allowMany: false })
		if (direct) {
			attach(direct.hits, entry, direct.via)
			continue
		}
		// 2 — an "…improvement(s)" row, which must resolve EVERY name it mentions. Ranger's level-6
		//     "Favored Enemy and Natural Explorer improvements" advances both, not whichever matched
		//     first, so a partial resolution is treated as no resolution.
		const derived = entry.names.slice(1)
		if (derived.length) {
			const hits = []
			const ok = derived.every((n) => {
				const m = match(n, { allowClaimed: true, allowMany: true })
				if (m) hits.push(...m.hits)
				return Boolean(m)
			})
			if (ok && hits.length) {
				attach([...new Set(hits)], entry, 'improvement')
				continue
			}
		}
		resolution.push({ table: entry.display, features: [], via: 'unresolved' })
	}

	return {
		resolution,
		claimed,
		unresolvedTableNames: resolution.filter((r) => r.via === 'unresolved').map((r) => r.table)
	}
}

/** Levels at which the class picks up a subclass feature — the rows holding "<X> feature". */
function placeholderLevels(progression) {
	const col = featuresColumn(progression.head)
	const out = []
	for (const row of progression.rows) {
		const level = parseOrdinal(row[0])
		if (!Number.isFinite(level)) continue
		if ((row[col] ?? '').split(',').some((c) => isPlaceholder(c))) out.push(level)
	}
	return out
}

// ---------------------------------------------------------------- heading walk

/**
 * Split markdown into { depth, title, body } sections in document order. Fenced code doesn't occur
 * in either corpus, so a plain line scan is enough.
 */
function sections(md) {
	const out = []
	let cur = null
	for (const line of md.split('\n')) {
		const m = line.match(/^(#{1,6})\s+(.*?)\s*$/)
		if (m) {
			cur = { depth: m[1].length, title: m[2], lines: [] }
			out.push(cur)
		} else if (cur) {
			cur.lines.push(line)
		}
	}
	return out.map((s) => ({ depth: s.depth, title: s.title, body: s.lines.join('\n').trim() }))
}

/** Fold a feature's `####` sub-headings (Fighting Style options, Pact Boon choices) into its body. */
function withSubheadings(secs, i, depth) {
	let body = secs[i].body
	for (let j = i + 1; j < secs.length && secs[j].depth > depth; j++) {
		body += `\n\n**${secs[j].title}**\n\n${secs[j].body}`
	}
	return body.trim()
}

// ---------------------------------------------------------------- selectable options

/**
 * Does this feature's intro promise that a list follows and you pick from it?
 *
 * The bar is deliberately "the choice is in the text below", not merely the word "choose". Paladin's
 * Sacred Oath says "Now you choose the Oath of Devotion…" but its two sub-blocks are Oath Spells and
 * Channel Divinity — things you get, not things you pick between. Every real option list in either
 * corpus points forward: "one of the following", "the table below", "consult the associated list".
 */
const CHOOSES_FROM_LIST = /\bthe following\b|\bbelow\b|\bassociated list\b/i

/** An option on its own line: "**Pact of the Chain**" followed by its paragraph. */
const BOLD_LINE = /^\*\*(.+?)\*\*$/gm
/** An option as a run-in heading: "***Colossus Slayer***. Your tenacity can wear down…" */
const RUN_IN_BOLD = /^\*\*\*(.+?)\*\*\*\.\s*/gm

/**
 * Split "intro, then N labelled blocks" into an intro and a list of options — Fighter's Fighting
 * Style, Warlock's Pact Boon, Sorcerer's Metamagic, both Druids' circle-spell tables, and the
 * Hunter's four pick-one features. Returns null when neither shape nor the intro qualifies, so the
 * feature is left as ordinary prose.
 */
export function inlineOptions(body) {
	for (const pattern of [BOLD_LINE, RUN_IN_BOLD]) {
		const marks = [...body.matchAll(pattern)]
		if (marks.length < 2) continue
		const intro = body.slice(0, marks[0].index)
		if (!CHOOSES_FROM_LIST.test(intro)) continue

		return {
			intro: intro.trim(),
			options: marks.map((m, i) => ({
				// "Table- Arctic Circle Spells" is a caption, not a name; the prefix is noise.
				label: m[1].replace(/^Table\s*[-–—:]\s*/i, '').trim(),
				body: body
					.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : body.length)
					.trim()
			}))
		}
	}
	return null
}

/**
 * A feature whose single table *is* the choice: 2014 Sorcerer's Draconic Ancestry, where each row is
 * a dragon and its damage type. The only instance in either corpus, hence the narrow trigger.
 */
export function tableRowOptions(body) {
	if (!/\bchoose one type of\b/i.test(body)) return null
	const lines = body.split('\n')
	let start = -1
	for (let i = 0; i < lines.length - 1; i++) {
		if (PIPE_ROW.test(lines[i]) && PIPE_SEP.test(lines[i + 1])) {
			start = i
			break
		}
	}
	if (start < 0) return null
	const head = splitCells(lines[start])
	const rows = []
	let end = start + 2
	for (; end < lines.length && PIPE_ROW.test(lines[end]); end++) {
		const cells = splitCells(lines[end])
		if (cells.some((c) => c !== '') && cells[0]) rows.push(cells)
	}
	if (rows.length < 2) return null

	const intro = [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim()
	const options = rows.map((r) => ({
		label: r[0],
		body: head
			.slice(1)
			.map((h, i) => `**${h}:** ${r[i + 1] ?? ''}`)
			.join('\n')
	}))
	return { intro, options }
}

function addFeature(features, name, levels, subclass, body) {
	const existing = features.find((f) => f.name === name && f.subclass === subclass)
	if (existing) {
		for (const l of levels) if (!existing.levels.includes(l)) existing.levels.push(l)
		existing.levels.sort((a, b) => a - b)
		if (body && !existing.body.includes(body)) existing.body += `\n\n${body}`
		return existing
	}
	const f = { name, levels: [...levels].sort((a, b) => a - b), subclass, body }
	features.push(f)
	return f
}

/**
 * Last pass over a finished class: lift any inline option list out of each feature's body into a
 * structured `options` array the page can render as a picker. Returns what it found so the build
 * can print it — the detector is a heuristic over prose, so every hit is worth a human glance.
 */
function extractOptions(features) {
	const found = []
	for (const f of features) {
		if (f.options) {
			found.push({ feature: f.name, count: f.options.length, via: 'section' })
			continue
		}
		const hit = inlineOptions(f.body) ?? tableRowOptions(f.body)
		if (!hit) continue
		f.body = hit.intro
		f.options = hit.options
		found.push({ feature: f.name, count: hit.options.length, via: 'inline' })
	}
	return found
}

// ---------------------------------------------------------------- 2024

export function parseClass2024(sectionMd, className) {
	const { text } = htmlTablesToPipe(sectionMd)
	const progression = findProgression(text)
	if (!progression) throw new Error(`${className}: no progression table`)

	const secs = sections(text)
	const features = []
	const basics = []
	let subclassName = ''

	// The Core Traits block is a headerless 2-column table sitting above the first heading.
	const preamble = text.slice(0, text.search(/^#{2,4}\s/m) < 0 ? text.length : undefined)
	const traits = findAnyTable(preamble.split('\n'))
	if (traits) {
		for (const row of traits.rows) {
			if (row.length >= 2 && row[0]) basics.push({ title: row[0], body: row.slice(1).join(' — ') })
		}
	}

	for (let i = 0; i < secs.length; i++) {
		const s = secs[i]
		if (s.depth !== 3) continue

		// "### Barbarian Class Features" — its Level-tagged children are the base features.
		if (s.title === `${className} Class Features`) {
			for (let j = i + 1; j < secs.length && secs[j].depth > 3; j++) {
				const m = secs[j].title.match(/^Level (\d{1,2}):\s*(.+)$/)
				if (m) addFeature(features, m[2].trim(), [Number(m[1])], null, withSubheadings(secs, j, 4))
			}
			continue
		}

		// "### Metamagic Options" / "### Eldritch Invocation Options" — 2024 parks the choices for a
		// feature in their own section further down the class ("…later in this class's description"),
		// so they have to be pulled back onto the feature they belong to or they vanish entirely.
		const opt = s.title.match(/^(.+?) Options$/)
		if (opt) {
			const target = features.find((f) => normalizeName(f.name) === normalizeName(opt[1]))
				// "Eldritch Invocation Options" belongs to the feature "Eldritch Invocations".
				?? features.find((f) => depluralize(normalizeName(f.name)) === depluralize(normalizeName(opt[1])))
			if (target) {
				target.options = []
				for (let j = i + 1; j < secs.length && secs[j].depth > 3; j++) {
					if (secs[j].depth === 4) target.options.push({ label: secs[j].title, body: secs[j].body })
				}
			}
			continue
		}

		// "### Barbarian Subclass: Path of the Berserker"
		const sub = s.title.match(new RegExp(`^${className} Subclass:\\s*(.+)$`))
		if (sub) {
			subclassName = sub[1].trim()
			for (let j = i + 1; j < secs.length && secs[j].depth > 3; j++) {
				const m = secs[j].title.match(/^Level (\d{1,2}):\s*(.+)$/)
				if (m) {
					addFeature(features, m[2].trim(), [Number(m[1])], subclassName, withSubheadings(secs, j, 4))
				}
			}
		}
		// "### Becoming a Barbarian …" and "### Bard Spell List" are deliberately dropped: multiclass
		// prerequisites and a 700-line spell index are not what you open mid-combat, and the spell
		// list is already browsable (by class) in the Spell Sets tool.
	}

	// Headings give the level the feature first appears; the table gives every level it recurs at.
	const base = features.filter((f) => f.subclass === null)
	const { resolution, unresolvedTableNames } = joinProgression(base, progression)
	const optionGroups = extractOptions(features)

	return {
		data: {
			name: className,
			slug: slugify(className),
			version: '2024',
			subclassName,
			basics,
			progression: { head: progression.head, rows: progression.rows },
			features
		},
		resolution,
		optionGroups,
		folded: [],
		fallbacks: [],
		unresolvedTableNames
	}
}

/** First GFM table of any shape in the given lines. */
function findAnyTable(lines) {
	for (let i = 0; i < lines.length - 1; i++) {
		if (!PIPE_ROW.test(lines[i]) || !PIPE_SEP.test(lines[i + 1])) continue
		const head = splitCells(lines[i])
		const rows = []
		for (let j = i + 2; j < lines.length && PIPE_ROW.test(lines[j]); j++) {
			const cells = splitCells(lines[j])
			if (cells.some((c) => c !== '')) rows.push(cells)
		}
		return { head, rows }
	}
	return null
}

export function splitClasses2024(md) {
	const out = []
	const re = /^## (.+)$/gm
	const marks = [...md.matchAll(re)]
	for (let i = 0; i < marks.length; i++) {
		const start = marks[i].index
		const end = i + 1 < marks.length ? marks[i + 1].index : md.length
		out.push({ name: marks[i][1].trim(), md: md.slice(start, end) })
	}
	return out
}

// ---------------------------------------------------------------- 2014

/**
 * The level a 2014 subclass feature is gained at, stated only in its opening prose.
 *
 * The trailing repeat group is not optional decoration: Druid's Circle Spells opens "At 3rd, 5th,
 * 7th, and 9th level", and matching only the ordinal that sits directly before the word "level"
 * would read that as 9th. The whole enumeration has to be consumed so the FIRST number wins.
 */
const LEVEL_IN_PROSE =
	/\b(\d{1,2})(?:st|nd|rd|th)(?:\s*,\s*(?:and\s+)?\d{1,2}(?:st|nd|rd|th))*(?:\s+and\s+\d{1,2}(?:st|nd|rd|th))?[- ]level\b/i

export function parseClass2014(md, className) {
	const progression = findProgression(md)
	if (!progression) throw new Error(`${className}: no progression table`)

	const secs = sections(md)
	const basics = []
	const features = []
	const unmatched = []
	const folded = []
	const fallbacks = []

	// Everything before the first `##` group heading is the base class; the group heading
	// ("## Barbarian Paths", "## Martial Archetypes") opens the subclass.
	const groupAt = secs.findIndex((s) => s.depth === 2)
	const baseEnd = groupAt < 0 ? secs.length : groupAt

	const headings = []
	for (let i = 0; i < baseEnd; i++) {
		const s = secs[i]
		if (s.depth === 4 && ['Hit Points', 'Proficiencies', 'Equipment'].includes(s.title)) {
			basics.push({ title: s.title, body: stripProgression(s.body) })
		} else if (s.depth === 3 && s.title !== 'Class Features') {
			headings.push({ name: s.title, levels: [], subclass: null, body: withSubheadings(secs, i, 3) })
		}
	}

	const { resolution, claimed, unresolvedTableNames } = joinProgression(headings, progression)

	// A heading the table never names is not a separate feature — OldManUmby promotes sub-parts of
	// Spellcasting ("Ritual Casting", "Spellcasting Ability", "Spellcasting Focus") to their own
	// `###`. Fold them back into the feature they follow, which is where the PHB has them.
	let last = null
	for (const h of headings) {
		if (claimed.has(h)) {
			features.push(h)
			last = h
			continue
		}
		// A repeated heading is 2014's equivalent of 2024's "### X Options" section: Warlock lists
		// "### Eldritch Invocations" twice, once as the level-2 feature and once as the catalogue of
		// all 33 invocations. Those belong to the feature of the same name, not to whichever heading
		// happened to precede the catalogue (which was the level-20 capstone).
		const twin = features.find((f) => normalizeName(f.name) === normalizeName(h.name))
		if (twin) {
			const marks = [...h.body.matchAll(BOLD_LINE)]
			if (marks.length >= 2) {
				twin.options = marks.map((m, i) => ({
					label: m[1].trim(),
					body: h.body
						.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : h.body.length)
						.trim()
				}))
				continue
			}
		}
		if (last) {
			last.body += `\n\n**${h.name}**\n\n${h.body}`
			folded.push(h.name)
		} else {
			unmatched.push(h.name)
		}
	}

	// Subclass: "### <Name>" under the group heading, then its "####" features. Two passes, because
	// a feature with no level in its prose needs the level the subclass itself is chosen at, and
	// that is only knowable once the other features have been read.
	let subclassName = ''
	const subFeatures = []
	for (let i = baseEnd; i < secs.length; i++) {
		const s = secs[i]
		if (s.depth === 3 && !subclassName) {
			subclassName = s.title // the subclass's own heading carries prose, never a feature
			continue
		}
		// Depth 5 as well as 4: OldManUmby marks exactly one subclass feature in the whole corpus at
		// `#####` — Oath of Devotion's Purity of Spirit — and treating it as a sub-heading folded it
		// into Aura of Devotion, quietly losing a level-15 feature. Nothing in the corpus nests below
		// a subclass feature, so there is nothing left for either depth to absorb.
		if ((s.depth === 4 || s.depth === 5) && subclassName) {
			const m = s.body.match(LEVEL_IN_PROSE)
			subFeatures.push({
				name: s.title,
				level: m ? Number(m[1]) : null,
				body: withSubheadings(secs, i, 5)
			})
		}
	}

	// Features like Paladin's "Tenets of Devotion" or Warlock's "Expanded Spell List" state no level
	// because you get them the instant you pick the subclass. That moment is the earliest level the
	// subclass touches at all — earlier than any "<X> feature" table row, which only marks where it
	// *improves*, so the prose-derived levels have to be in the minimum too.
	const known = subFeatures.map((f) => f.level).filter((l) => l !== null)
	const choiceLevels = [...known, ...placeholderLevels(progression)]
	const chosenAt = choiceLevels.length ? Math.min(...choiceLevels) : 1
	for (const f of subFeatures) {
		if (f.level === null) fallbacks.push({ name: f.name, level: chosenAt })
		addFeature(features, f.name, [f.level ?? chosenAt], subclassName, f.body)
	}

	const optionGroups = extractOptions(features)

	return {
		data: {
			name: className,
			slug: slugify(className),
			version: '2014',
			subclassName,
			basics,
			progression: { head: progression.head, rows: progression.rows },
			features
		},
		resolution,
		optionGroups,
		folded,
		fallbacks,
		unmatched,
		unresolvedTableNames
	}
}

/** The 2014 progression table sits inside the Equipment block; lift it out of that body. */
function stripProgression(body) {
	const lines = body.split('\n')
	const t = findProgression(body)
	if (!t) return body
	const keep = [...lines.slice(0, t.start), ...lines.slice(t.end)]
	return keep.join('\n').replace(/\*\*Table[-–—:][^\n]*\*\*\s*/g, '').replace(/\n{3,}/g, '\n\n').trim()
}
