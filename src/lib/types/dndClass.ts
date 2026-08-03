export type ClassVersion = '2024' | '2014'

export type ClassFeature = {
	name: string
	/**
	 * Every level the feature is gained or improves at, ascending — never empty. One heading can
	 * cover several levels: Ability Score Improvement is [4, 8, 12, 16, 19], and the 2014 Paladin's
	 * two auras both list 18 because the progression table improves them together.
	 */
	levels: number[]
	/** null for a base class feature; otherwise equal to the parent ClassData's subclassName. */
	subclass: string | null
	/** Markdown limited to what splitBlocks/renderInline handle: paragraphs, "- " lists, GFM tables. */
	body: string
	/**
	 * Present when the feature is a choice rather than a fixed benefit — a Fighting Style, a Pact
	 * Boon, which land your circle spells come from, which dragon your bloodline descends from. The
	 * `body` above is then just the intro that governs the list.
	 */
	options?: { label: string; body: string }[]
	/**
	 * Present when the choice is "pick N of these and keep them", not "which one is this?" — a Battle
	 * Master knows three maneuvers at 3rd level and nine at 15th. Each step is the level the allowance
	 * grows at and what it grows to.
	 */
	choose?: { level: number; count: number }[]
}

/** How many options a `choose` feature lets you keep at this character level. 0 before the first step. */
export function chooseCount(feature: Pick<ClassFeature, 'choose'>, level: number): number {
	return (feature.choose ?? []).reduce((n, s) => (s.level <= level ? Math.max(n, s.count) : n), 0)
}

/**
 * Counts the SRD states in prose rather than in the progression table, so they can't be read off the
 * data. Both Metamagic entries are quoted from their own ruleset: the 2014 Sorcerer gains one more
 * option at 10th and 17th, the 2024 one gains *two* more at each.
 */
const GROWS: Record<string, [level: number, count: number][]> = {
	'2014/sorcerer/Metamagic': [
		[3, 2],
		[10, 3],
		[17, 4]
	],
	'2024/sorcerer/Metamagic': [
		[2, 2],
		[10, 4],
		[17, 6]
	]
}

/** Where a feature's allowance is a progression column whose head isn't the feature's own name. */
const ALLOWANCE_COLUMN: Record<string, string> = {
	'Eldritch Invocations': 'Invocations Known'
}

/**
 * Options a feature hands you outright instead of making you choose between them at build time.
 * Without this they would render as a pick-one and everything you didn't tick would vanish.
 *
 * Two shapes end up here. Every 2014 Oath grants *both* its Channel Divinity options — one entry
 * covers all nine, since the key is the class and the feature name rather than the subclass. The
 * rest are chosen fresh each time you use them: which spirit the Shepherd summons, which Starry
 * Form the druid takes, which beast the Beast Master calls up after a long rest.
 */
const GRANTED = new Set([
	'2014/paladin/Channel Divinity',
	'2014/druid/Spirit Totem',
	'2014/druid/Starry Form',
	'2014/ranger/Primal Companion (optional)'
])

/**
 * How many of a feature's options you get to keep, as `choose` steps.
 *
 * Everything with options is a choice of some size, so the fallback is a pick-one at the level the
 * feature arrives. Where the count grows, it is read off the progression table by column — the
 * Warlock's invocations are already tabulated there, and restating those twenty numbers here would
 * only give them a way to disagree with the table on the same screen.
 */
export function allowance(
	data: Pick<ClassData, 'version' | 'slug' | 'progression'>,
	feature: ClassFeature
): { level: number; count: number }[] {
	if (feature.choose) return feature.choose // a hand-authored subclass states its own
	if (!feature.options) return []
	const id = `${data.version}/${data.slug}/${feature.name}`
	if (GRANTED.has(id)) return []
	// Guarded by the `options` check above: "Martial Arts" and "Sneak Attack" are both feature names
	// and column heads, and neither is a choice.
	const col = data.progression.head.findIndex(
		(h) => h === feature.name || h === ALLOWANCE_COLUMN[feature.name]
	)
	if (col > 0) {
		const steps: { level: number; count: number }[] = []
		data.progression.rows.forEach((row, i) => {
			const n = parseInt(row[col], 10)
			if (Number.isInteger(n) && n !== steps.at(-1)?.count) steps.push({ level: i + 1, count: n })
		})
		if (steps.length) return steps
	}
	return GROWS[id]?.map(([level, count]) => ({ level, count })) ?? [{ level: feature.levels[0], count: 1 }]
}

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

/**
 * Which scores an Ability Score Improvement went into, stored one entry per ASI level as
 * `"<level>|<first>|<second>"` — two slots because the feature is +1 to two scores or +2 to one,
 * which is the same thing said twice. Kept in `picks` alongside every other choice, so it persists
 * and exports with the rest rather than needing a store of its own.
 */
export function asiAt(entries: string[], level: number): [string, string] {
	const row = entries.find((e) => e.startsWith(`${level}|`))?.split('|') ?? []
	return [row[1] ?? '', row[2] ?? '']
}

export function setAsi(entries: string[], level: number, slot: 0 | 1, ability: string): string[] {
	const pair = asiAt(entries, level)
	pair[slot] = ability
	const rest = entries.filter((e) => !e.startsWith(`${level}|`))
	// An emptied row is dropped rather than stored blank, so "nothing recorded" has one spelling.
	return pair[0] || pair[1] ? [...rest, `${level}|${pair[0]}|${pair[1]}`] : rest
}

/** The running total across every ASI you have filled in — the answer to "so where am I now?". */
export function asiTotals(entries: string[]): { ability: string; bonus: number }[] {
	const by = new Map<string, number>()
	for (const e of entries) {
		for (const a of e.split('|').slice(1)) {
			if ((ABILITIES as readonly string[]).includes(a)) by.set(a, (by.get(a) ?? 0) + 1)
		}
	}
	return ABILITIES.filter((a) => by.has(a)).map((a) => ({ ability: a, bonus: by.get(a)! }))
}

/**
 * Record a box being opened or closed. Only deviations from what the page would have done on its own
 * are stored: fold a box that was open by default and it stays folded through level-ups, subclass
 * swaps and revisits, but open it again and the entry is dropped, so a feature you never touched
 * still pops open at the level you gain it. Returns the same map when nothing changed, because
 * `toggle` also fires when the attribute is set programmatically.
 */
export function nextFolds(
	folds: Record<string, boolean>,
	key: string,
	open: boolean,
	fallback: boolean
): Record<string, boolean> {
	if (open === fallback) {
		if (!(key in folds)) return folds
		const next = { ...folds }
		delete next[key]
		return next
	}
	return folds[key] === open ? folds : { ...folds, [key]: open }
}

export type ClassData = {
	name: string
	slug: string
	version: ClassVersion
	subclassName: string
	/** Un-levelled setup content — hit points, proficiencies, starting equipment. */
	basics: { title: string; body: string }[]
	progression: { head: string[]; rows: string[][] }
	features: ClassFeature[]
}

/**
 * A subclass the user typed in themselves.
 *
 * Each SRD ships exactly one subclass per class, and the rest are copyrighted Player's Handbook
 * text with no open-licensed source. So these live in localStorage on the user's own device and are
 * never committed or deployed — transcribing a book you own for your own reference is ordinary
 * personal use; publishing it is not. `downloadSubclasses` is the only way one leaves the browser.
 */
export type CustomSubclass = {
	id: string
	version: ClassVersion
	/** Class slug this subclass belongs to. */
	slug: string
	name: string
	features: { name: string; levels: number[]; body: string }[]
}

/**
 * Coerce a hand-typed level list into the shape the rest of the page assumes: a non-empty ascending
 * array of 1–20 integers. `ordered`, `groupHeads` and the open-by-default check all read
 * `levels[0]`, so an empty or unsorted array from a typo would break the group headings rather than
 * just one feature. Returns [] when nothing survives, and the caller drops the feature.
 */
export function parseLevels(input: string): number[] {
	return [
		...new Set(
			input
				.split(/[,\s]+/)
				.map((s) => Number(s.trim()))
				.filter((n) => Number.isInteger(n) && n >= 1 && n <= 20)
		)
	].sort((a, b) => a - b)
}

/** Same twelve in both rulesets. Artificer is in neither SRD. */
export const CLASS_SLUGS = [
	'barbarian',
	'bard',
	'cleric',
	'druid',
	'fighter',
	'monk',
	'paladin',
	'ranger',
	'rogue',
	'sorcerer',
	'warlock',
	'wizard'
] as const

export const CLASS_NAMES: Record<string, string> = Object.fromEntries(
	CLASS_SLUGS.map((s) => [s, s[0].toUpperCase() + s.slice(1)])
)

export const VERSIONS: { key: ClassVersion; label: string; long: string }[] = [
	{ key: '2024', label: '2024 (5.5)', long: "2024 Player's Handbook" },
	{ key: '2014', label: '2014 (5E)', long: "2014 Player's Handbook" }
]
