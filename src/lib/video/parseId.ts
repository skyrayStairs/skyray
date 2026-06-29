// Pure parser: extract an 11-char YouTube video id from whatever the user pasted.
// Handles watch?v=, youtu.be/, /embed/, /shorts/, /live/, a bare id, and returns null on junk.

const ID_RE = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeId(input: string): string | null {
	const trimmed = input.trim()
	if (!trimmed) return null

	// Bare id pasted directly.
	if (ID_RE.test(trimmed)) return trimmed

	let url: URL
	try {
		url = new URL(trimmed)
	} catch {
		return null
	}

	const host = url.hostname.replace(/^www\./, '')

	if (host === 'youtu.be') {
		const id = url.pathname.slice(1).split('/')[0]
		return ID_RE.test(id) ? id : null
	}

	if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
		// /watch?v=ID
		const v = url.searchParams.get('v')
		if (v && ID_RE.test(v)) return v
		// /embed/ID, /shorts/ID, /live/ID, /v/ID
		const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)
		if (m) return m[1]
	}

	return null
}
