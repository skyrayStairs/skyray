// The two regexes SpellCard has always used, plus the block split the class reference needs.
//
// There is no markdown dependency here on purpose: between the spell corpus and the generated class
// JSON the app only ever renders bold, italic, "- " bullets and GFM tables, and those are ~40 lines.
// Blocks are returned as data rather than HTML so the component can render real <ul>/<table>
// elements — {@html} is then limited to inline emphasis inside escaped text.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }

/**
 * Inline emphasis only, on HTML-escaped text. Safe for {@html} because every `<` in the source
 * becomes `&lt;` before any tag is introduced.
 *
 * `**bold**` must be replaced before `*italic*` or the opening `**` matches as an empty italic.
 * `_x_` is the 2024 SRD's run-in sub-heading style ("_Damage Resistance._"); `*x*` is the 2014
 * corpus's, as in the "(*a*) a greataxe" equipment lists.
 */
export function renderInline(md: string): string {
	return md
		.replace(/[&<>]/g, (c) => ESCAPES[c])
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/_(.+?)_/g, '<em>$1</em>')
		.replace(/\n/g, '<br>')
}

export type MdBlock =
	| { type: 'p'; md: string }
	| { type: 'ul'; items: string[] }
	| { type: 'table'; head: string[]; rows: string[][] }

const PIPE_ROW = /^\s*\|.*\|\s*$/
const PIPE_SEP = /^\s*\|[\s:|-]+\|\s*$/

function cells(line: string): string[] {
	return line
		.trim()
		.replace(/^\||\|$/g, '')
		.split('|')
		.map((c) => c.trim())
}

/**
 * Split a feature body into paragraphs, bullet lists and tables. A table is a run of pipe rows whose
 * second line is the `|---|` separator — the separator requirement is what stops a paragraph that
 * merely contains a `|` from being eaten.
 */
export function splitBlocks(md: string): MdBlock[] {
	const lines = md.split('\n')
	const out: MdBlock[] = []
	let para: string[] = []

	const flush = () => {
		const text = para.join('\n').trim()
		if (text) out.push({ type: 'p', md: text })
		para = []
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		if (PIPE_ROW.test(line) && PIPE_SEP.test(lines[i + 1] ?? '')) {
			flush()
			const head = cells(line)
			const rows: string[][] = []
			i += 2
			for (; i < lines.length && PIPE_ROW.test(lines[i]); i++) {
				const r = cells(lines[i])
				if (r.some((c) => c !== '')) rows.push(r)
			}
			i-- // the loop's own i++ consumes the first non-table line
			out.push({ type: 'table', head, rows })
			continue
		}

		if (/^\s*[-*]\s+/.test(line)) {
			flush()
			const items: string[] = []
			for (; i < lines.length && /^\s*[-*]\s+/.test(lines[i]); i++) {
				items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
			}
			i--
			out.push({ type: 'ul', items })
			continue
		}

		if (line.trim() === '') flush()
		else para.push(line)
	}
	flush()
	return out
}
