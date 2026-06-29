// Sample-accurate metronome built on the Web Audio API.
//
// Uses the standard "two clocks" lookahead scheduler: a coarse setInterval wakes us up
// periodically, and on each wake we schedule any ticks falling inside a short window using
// the AudioContext's precise clock. This keeps timing rock-steady even when the JS timer is
// throttled (e.g. background tab), which a naive setInterval-per-tick can't do.
//
// The AudioContext is owned by the caller (created/resumed inside a user gesture) so the
// page controls audio unlock and cleanup.

import { TICKS_PER_BEAT, type Subdivision } from '$lib/types/guitar'

export interface MetronomeConfig {
	bpm: number
	subdivision: Subdivision
	beatsPerMeasure: number
	accentBeats: number[]
	/** Fired ~at the moment each tick sounds, for a visual beat indicator. */
	onTick?: (beatIndex: number, accent: boolean) => void
	/** Skip the click sound but keep the timing + onTick (e.g. scale playback plays note tones only). */
	silent?: boolean
}

const LOOKAHEAD_MS = 25 // how often the scheduler wakes
const SCHEDULE_AHEAD_S = 0.1 // how far ahead of the audio clock we queue ticks

export class Metronome {
	private ctx: AudioContext
	private cfg: MetronomeConfig
	private timerId: ReturnType<typeof setInterval> | null = null
	private nextTickTime = 0 // ctx time of the next tick to schedule
	private tickInMeasure = 0 // index of next tick within the current measure

	constructor(ctx: AudioContext, cfg: MetronomeConfig) {
		this.ctx = ctx
		this.cfg = cfg
	}

	/** Swap settings. Realigns to the start of a measure so accents stay correct. */
	configure(cfg: MetronomeConfig): void {
		this.cfg = cfg
		this.tickInMeasure = 0
	}

	get running(): boolean {
		return this.timerId !== null
	}

	start(): void {
		if (this.timerId !== null) return
		this.tickInMeasure = 0
		// small offset so the first tick isn't scheduled in the past
		this.nextTickTime = this.ctx.currentTime + 0.06
		this.timerId = setInterval(() => this.scheduler(), LOOKAHEAD_MS)
	}

	stop(): void {
		if (this.timerId !== null) {
			clearInterval(this.timerId)
			this.timerId = null
		}
	}

	private secondsPerTick(): number {
		const ticksPerBeat = TICKS_PER_BEAT[this.cfg.subdivision]
		return 60 / this.cfg.bpm / ticksPerBeat
	}

	private scheduler(): void {
		const ticksPerBeat = TICKS_PER_BEAT[this.cfg.subdivision]
		const totalTicks = Math.max(1, this.cfg.beatsPerMeasure * ticksPerBeat)
		while (this.nextTickTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
			const beatIndex = Math.floor(this.tickInMeasure / ticksPerBeat)
			const isBeatOnset = this.tickInMeasure % ticksPerBeat === 0
			// Loud only on the onset of a beat the user marked "on beat"; everything else soft.
			const accent = isBeatOnset && this.cfg.accentBeats.includes(beatIndex)
			this.scheduleTick(this.nextTickTime, accent, beatIndex)
			this.nextTickTime += this.secondsPerTick()
			this.tickInMeasure = (this.tickInMeasure + 1) % totalTicks
		}
	}

	private scheduleTick(time: number, accent: boolean, beatIndex: number): void {
		if (!this.cfg.silent) {
			const osc = this.ctx.createOscillator()
			const gain = this.ctx.createGain()
			osc.frequency.value = accent ? 1600 : 900
			const peak = accent ? 0.9 : 0.32
			// Short click with a fast attack/decay envelope.
			gain.gain.setValueAtTime(0.0001, time)
			gain.gain.exponentialRampToValueAtTime(peak, time + 0.001)
			gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
			osc.connect(gain)
			gain.connect(this.ctx.destination)
			osc.start(time)
			osc.stop(time + 0.05)
		}

		if (this.cfg.onTick) {
			// Fire the visual callback roughly when the tick sounds.
			const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000)
			setTimeout(() => this.cfg.onTick?.(beatIndex, accent), delayMs)
		}
	}
}
