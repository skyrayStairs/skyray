import type { VideoLoop } from '$lib/types/guitar'

// Source-agnostic player the VideoLooper UI drives. Unlike the Metronome we don't own these
// players: they load asynchronously and the user can play/pause them via the player's own
// controls — hence `ready` (gate calls until loaded) and `onStateChange` (the source of truth
// for the real playing-state, used to drive the stopwatch and the Play/Pause label).
export interface LoopPlayer {
	ready: Promise<void>
	onStateChange?: (playing: boolean) => void
	// Arm the A-B loop (or whole-video loop when null). autoplay=false arms without starting
	// playback — used when applying a persisted active loop on mount (no user gesture yet).
	setActiveLoop(loop: VideoLoop | null, autoplay?: boolean): void
	// Update the active loop's bounds in place (no re-seek) when the user edits A/B mid-practice.
	refreshLoop(loop: VideoLoop): void
	setRate(rate: number): void
	play(): void
	pause(): void
	getCurrentTime(): number
	getDuration(): number
	destroy(): void // clear poll/rAF, tear down the player, revoke any object URL
}
