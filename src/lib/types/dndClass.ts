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
