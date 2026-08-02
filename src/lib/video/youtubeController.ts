import { YT_RATE_RANGE, type VideoLoop } from '$lib/types/guitar'
import type { LoopPlayer } from './LoopPlayer'
import { loadYouTubeApi, type YTNamespace, type YTPlayer } from './ytLoader'

// The embed floors off-grid rates toward 0 (1.03 → 1), so round to the nearest 0.05 here instead:
// a UI value of 1.15 must play at 1.15, not 1.1. Rounding via `n * step` lands on or a float-hair
// above a grid point, which the player's own flooring absorbs.
export function snapRate(rate: number): number {
	const { min, max, step } = YT_RATE_RANGE
	return Math.round(Math.min(max, Math.max(min, rate)) / step) * step
}

export class YouTubeController implements LoopPlayer {
	ready: Promise<void>
	onStateChange?: (playing: boolean) => void
	onLoopEnd?: () => void

	private player: YTPlayer | null = null
	private loop: VideoLoop | null = null
	private pollId: ReturnType<typeof setInterval> | null = null
	private pendingRate: number | null = null
	private destroyed = false
	private wholeLoop = true // no active region → loop the whole video at its end

	constructor(el: HTMLElement, videoId: string, opts: { onError?: (code: number) => void } = {}) {
		this.ready = new Promise<void>((resolve, reject) => {
			loadYouTubeApi().then(
				(yt: YTNamespace) => {
					if (this.destroyed) return
					this.player = new yt.Player(el, {
						videoId,
						width: '100%',
						height: '100%',
						host: 'https://www.youtube-nocookie.com',
						playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
						events: {
							onReady: () => {
								if (this.pendingRate != null) this.setRate(this.pendingRate)
								resolve()
							},
							onStateChange: (e) => {
								// With no active region, loop the whole video back to the start when it ends.
								if (this.wholeLoop && e.data === yt.PlayerState.ENDED) {
									this.player?.seekTo(0, true)
									this.player?.playVideo()
								}
								this.onStateChange?.(e.data === yt.PlayerState.PLAYING)
							},
							onError: (e) => opts.onError?.(e.data)
						}
					})
				},
				(err) => reject(err)
			)
		})
	}

	setActiveLoop(loop: VideoLoop | null, autoplay = true): void {
		this.loop = loop
		this.wholeLoop = !loop
		this.stopPoll()
		if (!loop || !this.player) return
		this.setRate(loop.rate)
		this.player.seekTo(loop.startSec, true)
		if (autoplay) this.player.playVideo()
		this.pollId = setInterval(() => {
			if (!this.player || !this.loop) return
			if (this.player.getCurrentTime() >= this.loop.endSec) {
				this.player.seekTo(this.loop.startSec, true)
				this.onLoopEnd?.()
			}
		}, 150)
	}

	refreshLoop(loop: VideoLoop): void {
		// Poll reads this.loop each tick, so swapping the reference updates A-B live without seeking.
		if (this.loop && this.loop.id === loop.id) this.loop = loop
	}

	setRate(rate: number): void {
		if (!this.player) {
			this.pendingRate = rate
			return
		}
		this.player.setPlaybackRate(snapRate(rate))
	}

	play(): void {
		this.player?.playVideo()
	}
	pause(): void {
		this.player?.pauseVideo()
	}
	getCurrentTime(): number {
		return this.player?.getCurrentTime() ?? 0
	}
	getDuration(): number {
		return this.player?.getDuration() ?? 0
	}

	private stopPoll(): void {
		if (this.pollId != null) {
			clearInterval(this.pollId)
			this.pollId = null
		}
	}

	destroy(): void {
		this.destroyed = true
		this.stopPoll()
		try {
			this.player?.destroy()
		} catch {
			/* player may already be gone */
		}
		this.player = null
	}
}
