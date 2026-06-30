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

// Bell "ding" rung once per second in the last 5 seconds of a countdown. Inharmonic sine partials
// with a long exponential decay give it a metallic bell timbre, distinct from the end-of-exercise
// beep. Caller owns the AudioContext (created/resumed inside a user gesture).
export function bell(ctx: AudioContext, opts: { freq?: number; duration?: number } = {}): void {
	const freq = opts.freq ?? 880
	const duration = opts.duration ?? 0.7
	const t = ctx.currentTime
	const out = ctx.createGain()
	out.gain.value = 0.6
	out.connect(ctx.destination)
	// fundamental + two inharmonic overtones (bell partials are not whole-number multiples)
	for (const { ratio, gain } of [
		{ ratio: 1, gain: 0.5 },
		{ ratio: 2.0, gain: 0.25 },
		{ ratio: 2.76, gain: 0.12 }
	]) {
		const osc = ctx.createOscillator()
		const g = ctx.createGain()
		osc.type = 'sine'
		osc.frequency.value = freq * ratio
		g.gain.setValueAtTime(0.0001, t)
		g.gain.exponentialRampToValueAtTime(gain, t + 0.005)
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
		osc.connect(g)
		g.connect(out)
		osc.start(t)
		osc.stop(t + duration + 0.05)
	}
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
