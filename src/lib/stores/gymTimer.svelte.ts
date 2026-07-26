// Shared rest timer for the Gym tracker (/sandbox/gym). Lives in a module singleton because two
// unrelated places drive it: ticking a set's done box starts it, and the sticky bar displays and
// controls it. Mutate through the methods; the $state fields are read by the bar.

import { beep, bell } from '$lib/audio/beep'

class RestTimer {
	/** Seconds left, fractional — format for display at the call site. */
	remaining = $state(0)
	/** What the rest was armed for, so a progress bar has a denominator. 0 = idle. */
	total = $state(0)
	running = $state(false)
	/** What the rest follows, e.g. "Bench Press — set 2". Shown in the bar. */
	label = $state('')

	#tickId: ReturnType<typeof setInterval> | null = null
	#remAtSegmentStart = 0
	#segmentStartedAt = 0
	#lastBellSec = -1
	#ctx: AudioContext | null = null

	/**
	 * Arm a countdown. Must be called from a user gesture (a done-box tap or the Start button) —
	 * that's what unlocks the AudioContext, and without it the bells never sound.
	 */
	start(sec: number, label = '') {
		const total = Math.max(0, Math.round(sec))
		this.#ensureAudio()
		if (total === 0) {
			this.stop()
			return
		}
		this.total = total
		this.remaining = total
		this.label = label
		this.#remAtSegmentStart = total
		this.#segmentStartedAt = performance.now()
		this.#lastBellSec = -1
		this.running = true
		this.#startLoop()
	}

	pause() {
		if (!this.running) return
		this.#remAtSegmentStart = this.remaining // freeze where we are
		this.running = false
		this.#stopLoop()
	}

	resume() {
		if (this.running || this.total === 0) return
		this.#segmentStartedAt = performance.now()
		this.running = true
		this.#startLoop()
	}

	toggle() {
		if (this.running) this.pause()
		else this.resume()
	}

	/** Add or remove seconds mid-rest. Dropping to zero ends the rest as if it had elapsed. */
	nudge(delta: number) {
		if (this.total === 0) return
		const next = this.remaining + delta
		if (next <= 0) {
			this.#finish()
			return
		}
		this.#remAtSegmentStart = next
		this.remaining = next
		this.total = Math.max(this.total, Math.ceil(next))
		this.#segmentStartedAt = performance.now()
		this.#lastBellSec = -1
	}

	/** Clear the timer without the end-of-rest beep (Skip, or leaving the page). */
	stop() {
		this.#stopLoop()
		this.running = false
		this.remaining = 0
		this.total = 0
		this.label = ''
	}

	/** Release the AudioContext too — for page teardown, not between rests. */
	teardown() {
		this.stop()
		if (this.#ctx) {
			this.#ctx.close()
			this.#ctx = null
		}
	}

	#finish() {
		this.#stopLoop()
		this.running = false
		this.remaining = 0
		this.total = 0
		this.label = ''
		if (this.#ctx) beep(this.#ctx)
	}

	// setInterval, not requestAnimationFrame: rAF stops entirely while the tab is hidden, and a rest
	// timer is used with the phone face-down or switched away from. Intervals keep firing when hidden
	// (throttled to ~1s), and every tick recomputes from a performance.now() delta rather than
	// accumulating, so a throttled or skipped tick can't make the rest drift long.
	// ponytail: a hidden tab throttles this to ~1s, and after ~5 minutes hidden Chrome's intensive
	// throttling drops it to roughly once a minute (measured: a 100ms timer took 999ms in a
	// background tab). So while you're away the rest can *end* late and its final bells can be
	// missed or coalesced — but because every tick recomputes from the delta, the moment the page is
	// looked at again the countdown shows the truth and finishes immediately. Exact bells while
	// hidden would need a Web Worker clock or tones scheduled ahead on the AudioContext.
	#startLoop() {
		this.#stopLoop()
		this.#tickId = setInterval(() => {
			if (!this.running) {
				this.#stopLoop()
				return
			}
			const rem = this.#remAtSegmentStart - (performance.now() - this.#segmentStartedAt) / 1000
			if (rem <= 0) {
				this.#finish()
				return
			}
			this.remaining = rem
			// One bell per second through the final 5, as a "get ready" cue.
			const sec = Math.ceil(rem)
			if (sec <= 5 && sec !== this.#lastBellSec) {
				this.#lastBellSec = sec
				if (this.#ctx) bell(this.#ctx, { freq: 587 })
			}
		}, 250)
	}

	#stopLoop() {
		if (this.#tickId !== null) {
			clearInterval(this.#tickId)
			this.#tickId = null
		}
	}

	/**
	 * Safari's default session behaves as `ambient`, which loses to whatever app is already playing:
	 * put music on and the bells simply don't arrive. `transient` is the notification category — the
	 * tone plays over the music and ducks it for its own length, then the music comes back up. Not
	 * `transient-solo`, which pauses the other app instead of ducking it.
	 *
	 * Set before the context exists, because a category change on a running session is not specified
	 * to take effect. Safari-only (Audio Session API); everywhere else this is a no-op and the beep
	 * keeps whatever mixing behaviour the browser gives it.
	 */
	#ensureAudio() {
		const nav = navigator as Navigator & { audioSession?: { type: string } }
		try {
			if (nav.audioSession) nav.audioSession.type = 'transient'
		} catch {
			// An unsupported value throws rather than degrading; the beep is still worth having.
		}
		if (!this.#ctx) this.#ctx = new AudioContext()
		if (this.#ctx.state === 'suspended') this.#ctx.resume()
	}
}

export const restTimer = new RestTimer()
