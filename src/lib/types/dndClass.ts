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
