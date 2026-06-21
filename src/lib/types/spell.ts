export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface SpellEntry {
	name: string
	level: SpellLevel
	school: string
	ritual: boolean
	concentration: boolean
	castingTime: string
	range: string
	components: string
	material: string
	duration: string
	classes: string[]
	description: string
	atHigherLevels: string
	effectTypes: string[]
}
