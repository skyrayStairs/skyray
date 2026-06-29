// mm:ss formatting/parsing for the exercise duration field.

/** Seconds -> "m:ss" (e.g. 90 -> "1:30"). */
export function formatMmss(totalSec: number): string {
	const s = Math.max(0, Math.floor(totalSec))
	const m = Math.floor(s / 60)
	const sec = s % 60
	return `${m}:${sec.toString().padStart(2, '0')}`
}

/** Seconds -> "m:ss.mmm" with milliseconds (e.g. 90.5 -> "1:30.500"). */
export function formatMmssMs(totalSec: number): string {
	const totalMs = Math.max(0, Math.floor(totalSec * 1000))
	const m = Math.floor(totalMs / 60000)
	const sec = Math.floor((totalMs % 60000) / 1000)
	const ms = totalMs % 1000
	return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

/**
 * Parse a time field allowing fractional seconds: "m:ss.mmm", "m:ss", or bare seconds
 * ("13.5"). Returns seconds (may be fractional), or null when invalid.
 */
export function parseMmssMs(input: string): number | null {
	const trimmed = input.trim()
	if (!trimmed) return null
	if (trimmed.includes(':')) {
		const [mPart, sPart] = trimmed.split(':')
		const mins = parseInt(mPart, 10)
		const secs = parseFloat(sPart)
		if (Number.isNaN(mins) || Number.isNaN(secs)) return null
		if (mins < 0 || secs < 0 || secs >= 60) return null
		return mins * 60 + secs
	}
	const n = parseFloat(trimmed)
	if (Number.isNaN(n) || n < 0) return null
	return n
}

/**
 * Parse a duration field. Accepts "mm:ss", "m:ss", or a bare seconds count.
 * Returns seconds, or null when the input is not a valid time.
 */
export function parseMmss(input: string): number | null {
	const trimmed = input.trim()
	if (!trimmed) return null
	if (trimmed.includes(':')) {
		const [mPart, sPart] = trimmed.split(':')
		const mins = parseInt(mPart, 10)
		const secs = parseInt(sPart, 10)
		if (Number.isNaN(mins) || Number.isNaN(secs)) return null
		if (mins < 0 || secs < 0 || secs > 59) return null
		return mins * 60 + secs
	}
	const n = parseInt(trimmed, 10)
	if (Number.isNaN(n) || n < 0) return null
	return n
}
