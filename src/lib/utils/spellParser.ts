import type { SpellEntry, SpellLevel } from '$lib/types/spell'
import raw from '$lib/assets/data/dnd/5e-spells.txt?raw'

function parseComponents(rawVal: string): { components: string; material: string } {
	const parenMatch = rawVal.match(/\((.+)\)/s)
	const material = parenMatch ? parenMatch[1].trim() : ''
	const letterPart = rawVal.replace(/\(.*\)/s, '').replace(/,/g, ' ').trim()
	const tokens = letterPart.toUpperCase().split(/\s+/).filter((t) => /^[VSM]$/.test(t))
	const components = [...new Set(tokens)].sort().join(' ')
	return { components, material }
}

function parseDuration(rawVal: string): { duration: string; concentration: boolean } {
	const concentration = /\(concentration\)/i.test(rawVal)
	const duration = rawVal.replace(/\(concentration\),?\s*/i, '').trim()
	return { duration, concentration }
}

function parseBlock(block: string): SpellEntry | null {
	const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
	if (lines.length < 7) return null

	const name = lines[0]

	const levelLine = lines[1]
	const ritual = /\(ritual\)/i.test(levelLine)
	const levelSchoolClean = levelLine.replace(/\(ritual\)\s*/i, '').trim()
	const parts = levelSchoolClean.split(/\s+/)
	const levelToken = parts[0]
	const schoolToken = parts[1] ?? 'unknown'
	const level: SpellLevel = levelToken.toLowerCase() === 'cantrip' ? 0 : (parseInt(levelToken, 10) as SpellLevel)
	const school = schoolToken.toLowerCase()

	let effectTypes: string[] = []
	let castingTime = ''
	let range = ''
	let components = ''
	let material = ''
	let duration = ''
	let concentration = false
	let classes: string[] = []
	const descriptionLines: string[] = []
	let inDescription = false

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i]
		const lower = line.toLowerCase()

		if (!inDescription) {
			if (lower.startsWith('effect type:')) {
				const val = line.slice(line.indexOf(':') + 1).trim()
				effectTypes = val.split(',').map((s) => s.trim()).filter(Boolean)
			} else if (lower.startsWith('casting time:')) {
				castingTime = line.slice(line.indexOf(':') + 1).trim().toLowerCase()
			} else if (lower.startsWith('range:')) {
				range = line.slice(6).trim()
			} else if (lower.startsWith('components:')) {
				const val = line.slice(11).trim()
				;({ components, material } = parseComponents(val))
			} else if (lower.startsWith('duration:')) {
				const val = line.slice(9).trim()
				;({ duration, concentration } = parseDuration(val))
			} else if (lower.startsWith('classes:')) {
				classes = line.slice(8).trim().split(',').map((s) => s.trim()).filter(Boolean)
				inDescription = true
			}
		} else {
			descriptionLines.push(line)
		}
	}

	const fullDesc = descriptionLines.join('\n')
	const ahlMarker = /\*\*At Higher Levels\*\*:/i
	const ahlIdx = fullDesc.search(ahlMarker)
	let description = fullDesc
	let atHigherLevels = ''
	if (ahlIdx !== -1) {
		description = fullDesc.slice(0, ahlIdx).trim()
		atHigherLevels = fullDesc.slice(ahlIdx).replace(ahlMarker, '').replace(/^\s*/, '').trim()
	}

	return {
		name,
		level,
		school,
		ritual,
		concentration,
		castingTime,
		range,
		components,
		material,
		duration,
		classes,
		description,
		atHigherLevels,
		effectTypes
	}
}

function parseSpells(): SpellEntry[] {
	const normalized = raw.replace(/\r\n/g, '\n')
	const blocks = normalized.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
	return blocks.map(parseBlock).filter((s): s is SpellEntry => s !== null)
}

function dedupeByName(spells: SpellEntry[]): SpellEntry[] {
	const seen = new Set<string>()
	return spells.filter((s) => {
		if (seen.has(s.name)) return false
		seen.add(s.name)
		return true
	})
}

export const SPELLS: SpellEntry[] = dedupeByName(parseSpells())

export function bucketCastingTime(ct: string): string {
	if (ct.startsWith('1 reaction')) return 'reaction'
	if (ct.startsWith('1 bonus action')) return 'bonus action'
	if (ct.startsWith('1 action')) return 'action'
	if (ct === '1 minute') return '1 minute'
	return 'longer'
}

export function bucketRange(r: string): string {
	const lower = r.toLowerCase()
	if (lower.startsWith('self')) return 'Self'
	if (lower === 'touch') return 'Touch'
	const num = parseInt(lower.replace(/[^0-9].*/, ''), 10)
	if (isNaN(num)) return 'Other'
	if (num <= 30) return '0-30ft'
	if (num <= 100) return '31-100ft'
	return '100+ft'
}

export function bucketDuration(d: string): string {
	const lower = d.toLowerCase()
	if (lower === 'instantaneous' || lower.startsWith('instantaneous')) return 'Instantaneous'
	if (lower === '1 round' || lower.includes('6 rounds')) return '1 round'
	if (lower.includes('10 minutes') || lower.includes('10-minute')) return 'up to 10 min'
	if (lower.includes('1 minute') || lower.includes('6 rounds')) return 'up to 1 min'
	return 'longer'
}
