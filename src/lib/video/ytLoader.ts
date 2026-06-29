// Singleton loader for the YouTube IFrame Player API. The global onYouTubeIframeAPIReady
// callback fires exactly once, so every caller must await the same shared promise (and we
// resolve immediately if the API is already present, e.g. after client-side navigation).

export interface YTPlayer {
	playVideo(): void
	pauseVideo(): void
	seekTo(seconds: number, allowSeekAhead?: boolean): void
	getCurrentTime(): number
	getDuration(): number
	setPlaybackRate(rate: number): void
	getAvailablePlaybackRates(): number[]
	loadVideoById(id: string): void
	destroy(): void
}

export interface YTPlayerEvent {
	target: YTPlayer
	data: number
}

export interface YTPlayerOptions {
	videoId?: string
	width?: number | string
	height?: number | string
	host?: string
	playerVars?: Record<string, unknown>
	events?: {
		onReady?: (e: YTPlayerEvent) => void
		onStateChange?: (e: YTPlayerEvent) => void
		onError?: (e: YTPlayerEvent) => void
	}
}

export interface YTNamespace {
	Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer
	PlayerState: {
		UNSTARTED: number
		ENDED: number
		PLAYING: number
		PAUSED: number
		BUFFERING: number
		CUED: number
	}
}

declare global {
	interface Window {
		YT?: YTNamespace
		onYouTubeIframeAPIReady?: () => void
	}
}

let promise: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
	if (typeof window === 'undefined') return Promise.reject(new Error('YouTube API needs a browser'))
	if (window.YT?.Player) return Promise.resolve(window.YT)
	if (promise) return promise

	promise = new Promise<YTNamespace>((resolve) => {
		const prev = window.onYouTubeIframeAPIReady
		window.onYouTubeIframeAPIReady = () => {
			prev?.()
			resolve(window.YT as YTNamespace)
		}
		const tag = document.createElement('script')
		tag.src = 'https://www.youtube.com/iframe_api'
		document.head.appendChild(tag)
	})
	return promise
}
