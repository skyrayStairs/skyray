import type { VideoLoop } from '$lib/types/guitar'
import type { LoopPlayer } from './LoopPlayer'

type PitchMedia = HTMLMediaElement & {
	preservesPitch?: boolean
	webkitPreservesPitch?: boolean
	mozPreservesPitch?: boolean
}

// Wraps a native <video> or <audio> (both are HTMLMediaElement). Unlike YouTube, playbackRate is
// arbitrary and preservesPitch lets the user slow down without the chipmunk effect. A-B loop runs
// on rAF (timeupdate's ~4Hz is too coarse for a short lick).
export class FileController implements LoopPlayer {
	ready: Promise<void>
	onStateChange?: (playing: boolean) => void
	onLoopEnd?: () => void

	private video: HTMLMediaElement
	private loop: VideoLoop | null = null
	private rafId: number | null = null
	private objectUrl: string

	constructor(video: HTMLMediaElement, blob: Blob, preservesPitch: boolean) {
		this.video = video
		this.objectUrl = URL.createObjectURL(blob)
		video.src = this.objectUrl
		if (video instanceof HTMLVideoElement) video.playsInline = true
		video.loop = true // default (no active region): loop the whole video at its end
		this.setPreservesPitch(preservesPitch)
		video.addEventListener('play', this.handlePlay)
		video.addEventListener('pause', this.handlePause)
		this.ready = new Promise<void>((resolve) => {
			if (video.readyState >= 1) resolve()
			else video.addEventListener('loadedmetadata', () => resolve(), { once: true })
		})
	}

	private handlePlay = () => this.onStateChange?.(true)
	private handlePause = () => this.onStateChange?.(false)

	setPreservesPitch(value: boolean): void {
		const v = this.video as PitchMedia
		v.preservesPitch = value
		v.webkitPreservesPitch = value
		v.mozPreservesPitch = value
	}

	setActiveLoop(loop: VideoLoop | null, autoplay = true): void {
		this.loop = loop
		this.stopRaf()
		if (!loop) {
			this.video.loop = true // play through, loop whole video at its end
			return
		}
		this.video.loop = false // an A-B region governs looping instead
		this.setRate(loop.rate)
		this.video.currentTime = loop.startSec
		if (autoplay) void this.video.play().catch(() => {})
		const tick = () => {
			if (!this.loop) return
			if (this.video.currentTime >= this.loop.endSec) {
				this.video.currentTime = this.loop.startSec
				this.onLoopEnd?.()
			}
			this.rafId = requestAnimationFrame(tick)
		}
		this.rafId = requestAnimationFrame(tick)
	}

	refreshLoop(loop: VideoLoop): void {
		// The rAF reads this.loop each frame, so swapping it updates A-B live without seeking.
		if (this.loop && this.loop.id === loop.id) this.loop = loop
	}

	setRate(rate: number): void {
		this.video.playbackRate = rate
	}
	play(): void {
		void this.video.play().catch(() => {})
	}
	pause(): void {
		this.video.pause()
	}
	getCurrentTime(): number {
		return this.video.currentTime
	}
	getDuration(): number {
		return Number.isFinite(this.video.duration) ? this.video.duration : 0
	}

	private stopRaf(): void {
		if (this.rafId != null) {
			cancelAnimationFrame(this.rafId)
			this.rafId = null
		}
	}

	destroy(): void {
		this.stopRaf()
		this.video.removeEventListener('play', this.handlePlay)
		this.video.removeEventListener('pause', this.handlePause)
		try {
			this.video.pause()
		} catch {
			/* ignore */
		}
		this.video.removeAttribute('src')
		this.video.load()
		URL.revokeObjectURL(this.objectUrl)
	}
}
