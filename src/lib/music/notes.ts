// Note math for the fretboard, derived purely from standard tuning — so every note position is
// correct by construction (no transcribed tables). Pitch classes are 0..11 with C = 0.

export type StringNum = 6 | 5 | 4 | 3 | 2 | 1

// Open-string pitch classes, standard tuning E A D G B E (6th = low E … 1st = high E).
export const STRING_OPEN_PC: Record<StringNum, number> = {
	6: 4, // E
	5: 9, // A
	4: 2, // D
	3: 7, // G
	2: 11, // B
	1: 4 // E
}

// Sharp spelling; the fretboard only ever labels naturals (note map / quiz) so enharmonics
// of accidentals never surface in the UI.
export const NOTE_NAMES = [
	'C',
	'C#',
	'D',
	'D#',
	'E',
	'F',
	'F#',
	'G',
	'G#',
	'A',
	'A#',
	'B'
] as const

// The seven natural notes and their solfège (movable Do).
export const NATURALS: { pc: number; name: string; solfege: string }[] = [
	{ pc: 0, name: 'C', solfege: 'Do' },
	{ pc: 2, name: 'D', solfege: 'Re' },
	{ pc: 4, name: 'E', solfege: 'Mi' },
	{ pc: 5, name: 'F', solfege: 'Fa' },
	{ pc: 7, name: 'G', solfege: 'Sol' },
	{ pc: 9, name: 'A', solfege: 'La' },
	{ pc: 11, name: 'B', solfege: 'Ti' }
]

export function noteName(pc: number): string {
	return NOTE_NAMES[((pc % 12) + 12) % 12]
}

// Open-string MIDI numbers (E2 A2 D3 G3 B3 E4) for sounding scale notes.
export const STRING_OPEN_MIDI: Record<StringNum, number> = {
	6: 40,
	5: 45,
	4: 50,
	3: 55,
	2: 59,
	1: 64
}

export function midiAt(string: StringNum, fret: number): number {
	return STRING_OPEN_MIDI[string] + fret
}

export function freqAt(string: StringNum, fret: number): number {
	return 440 * 2 ** ((midiAt(string, fret) - 69) / 12)
}

export function noteAt(string: StringNum, fret: number): { pc: number; name: string } {
	const pc = (STRING_OPEN_PC[string] + fret) % 12
	return { pc, name: noteName(pc) }
}

/** Frets (0..maxFret) on a string where the given pitch class sounds. */
export function fretsForPc(string: StringNum, pc: number, maxFret = 12): number[] {
	const target = ((pc % 12) + 12) % 12
	const out: number[] = []
	for (let f = 0; f <= maxFret; f++) {
		if ((STRING_OPEN_PC[string] + f) % 12 === target) out.push(f)
	}
	return out
}

/** Natural-note positions on a string within 0..maxFret (for the note-map view). */
export function naturalsOnString(
	string: StringNum,
	maxFret = 12
): { fret: number; pc: number; name: string }[] {
	const out: { fret: number; pc: number; name: string }[] = []
	for (let f = 0; f <= maxFret; f++) {
		const pc = (STRING_OPEN_PC[string] + f) % 12
		const nat = NATURALS.find((n) => n.pc === pc)
		if (nat) out.push({ fret: f, pc, name: nat.name })
	}
	return out
}
