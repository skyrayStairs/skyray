// Short sine beep marking the end of an exercise, before advancing to the next one.
// Caller owns the AudioContext (created/resumed inside a user gesture).

export function beep(ctx: AudioContext, opts: { freq?: number; duration?: number } = {}): void {
	const freq = opts.freq ?? 880
	const duration = opts.duration ?? 0.2
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	osc.type = 'sine'
	osc.frequency.value = freq
	const t = ctx.currentTime
	gain.gain.setValueAtTime(0.0001, t)
	gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
	gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
	osc.connect(gain)
	gain.connect(ctx.destination)
	osc.start(t)
	osc.stop(t + duration + 0.02)
}

// Plucked note tone for scale playback. Sawtooth through a lowpass with a downward filter sweep
// and a fast-attack/long-decay envelope — a rough "clean electric" pluck. Longer than a beep so
// notes ring a bit.
export function tone(ctx: AudioContext, freq: number, duration = 0.55): void {
	const osc = ctx.createOscillator()
	const lp = ctx.createBiquadFilter()
	const gain = ctx.createGain()
	const t = ctx.currentTime

	osc.type = 'sawtooth'
	osc.frequency.value = freq

	lp.type = 'lowpass'
	lp.Q.value = 0.8
	// brightness drops as the note decays (pluck character)
	lp.frequency.setValueAtTime(Math.min(8000, freq * 8), t)
	lp.frequency.exponentialRampToValueAtTime(Math.max(700, freq * 2), t + duration * 0.7)

	gain.gain.setValueAtTime(0.0001, t)
	gain.gain.exponentialRampToValueAtTime(0.4, t + 0.006) // fast pluck attack
	gain.gain.exponentialRampToValueAtTime(0.0001, t + duration) // long decay

	osc.connect(lp)
	lp.connect(gain)
	gain.connect(ctx.destination)
	osc.start(t)
	osc.stop(t + duration + 0.05)
}
