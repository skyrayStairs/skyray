<script lang="ts">
	import { onMount } from 'svelte'
	import {
		FILE_RATE_RANGE,
		YT_PLAYBACK_RATES,
		makeVideoLoop,
		type VideoConfig,
		type VideoLoop
	} from '$lib/types/guitar'
	import { formatMmssMs } from '$lib/utils/time'
	import { getVideoBlob } from '$lib/storage/videoBlobs'
	import type { LoopPlayer } from '$lib/video/LoopPlayer'
	import { YouTubeController } from '$lib/video/youtubeController'
	import { FileController } from '$lib/video/fileController'

	let {
		video,
		mode,
		onChange,
		finishing = false,
		onFinished
	}: {
		video: VideoConfig
		mode: 'edit' | 'run'
		onChange: (next: VideoConfig) => void
		// Run-mode: the routine timer ran out and is waiting for the current loop to finish (req 7).
		finishing?: boolean
		onFinished?: () => void
	} = $props()

	let mountEl = $state<HTMLDivElement>() // YouTube replaces this with its iframe
	let mediaEl = $state<HTMLMediaElement>() // native <video> or <audio> for local files
	let controller: LoopPlayer | null = null
	let ready = $state(false) // controller built and usable

	let errorMsg = $state('')
	let missingBlob = $state(false)
	let playing = $state(false)
	let expandedLoopId = $state<string | null>(null)

	// The active loop is persisted on the config (shared single-active flag).
	const activeLoopId = $derived(video.activeLoopId ?? null)

	// Stopwatch = time the video has actually been PLAYING since the current loop was activated.
	let stopwatchSec = $state(0)
	let stopwatchBase = 0
	let segStart = 0
	let swRaf: number | null = null // rAF id driving the ms stopwatch

	const isYouTube = $derived(video.source.kind === 'youtube')
	const isAudio = $derived(video.source.kind === 'file' && video.source.mediaKind === 'audio')

	// ---- graceful finish (req 7): when the routine timer runs out, don't cut the loop off mid-lick.
	// If an A-B loop is actively playing, wait for the next B→A wrap; otherwise finish immediately.
	let awaitingBoundary = $state(false)
	$effect(() => {
		if (!finishing) {
			awaitingBoundary = false
			return
		}
		if (playing && activeLoopId != null) {
			awaitingBoundary = true // wait for the next B→A wrap (fired via controller.onLoopEnd)
		} else {
			// Nothing to wait for (paused, or whole-video play-through) → finish now.
			awaitingBoundary = false
			onFinished?.()
		}
	})

	onMount(() => {
		buildController().catch((e) => (errorMsg = String(e)))
		return () => {
			stopSwInterval()
			controller?.destroy()
			controller = null
		}
	})

	async function buildController() {
		if (video.source.kind === 'youtube') {
			if (!mountEl) return
			controller = new YouTubeController(mountEl, video.source.videoId, {
				onError: (code) => {
					errorMsg =
						code === 101 || code === 150
							? "This video's owner doesn't allow it to be embedded."
							: `YouTube error (${code}).`
				}
			})
		} else {
			const blob = await getVideoBlob(video.source.fileId)
			if (!blob) {
				missingBlob = true
				return
			}
			if (!mediaEl) return
			controller = new FileController(mediaEl, blob, video.preservesPitch ?? true)
		}
		controller.onStateChange = handlePlaying
		controller.onLoopEnd = () => {
			if (awaitingBoundary) {
				awaitingBoundary = false
				onFinished?.()
			}
		}
		ready = true
		// Apply the persisted active loop (or whole-video play-through when none). Wait for the
		// player to actually exist (YT creates it async) and arm WITHOUT autoplay — there's no
		// user gesture on mount, and auto-playing on open would be intrusive in the editor.
		await whenReady()
		controller.setActiveLoop(video.loops.find((l) => l.id === activeLoopId) ?? null, false)
	}

	// ---- stopwatch ----
	function handlePlaying(p: boolean) {
		if (p && !playing) {
			segStart = performance.now()
			startSwInterval()
		} else if (!p && playing) {
			stopwatchBase += (performance.now() - segStart) / 1000
			stopwatchSec = stopwatchBase
			stopSwInterval()
		}
		playing = p
	}
	// rAF (not setInterval) so the millisecond stopwatch updates smoothly.
	function startSwInterval() {
		if (swRaf !== null) return
		const frame = () => {
			stopwatchSec = stopwatchBase + (performance.now() - segStart) / 1000
			swRaf = requestAnimationFrame(frame)
		}
		swRaf = requestAnimationFrame(frame)
	}
	function stopSwInterval() {
		if (swRaf !== null) {
			cancelAnimationFrame(swRaf)
			swRaf = null
		}
	}
	function resetStopwatch() {
		stopwatchBase = 0
		stopwatchSec = 0
		if (playing) segStart = performance.now()
	}

	// Wait for the player to load, but never block forever — a broken/unsupported file may never
	// fire loadedmetadata, and the user must still be able to add loops.
	function whenReady(ms = 1500): Promise<void> {
		if (!controller) return Promise.resolve()
		return Promise.race([controller.ready, new Promise<void>((r) => setTimeout(r, ms))])
	}

	// ---- persistence helpers ----
	function commit(next: Partial<VideoConfig>) {
		onChange({ ...video, ...next })
	}
	function updateLoop(id: string, patch: Partial<VideoLoop>) {
		const loops = video.loops.map((l) => (l.id === id ? { ...l, ...patch } : l))
		commit({ loops })
		// Apply edits to the live player when the active loop changes (bounds + rate), no re-seek.
		if (id === activeLoopId) {
			const updated = loops.find((l) => l.id === id)
			if (updated) {
				controller?.refreshLoop(updated)
				if (patch.rate !== undefined) controller?.setRate(updated.rate)
			}
		}
	}

	// ---- loop actions ----
	// Activate/deactivate is a shared flag: only one loop holds it. null → whole-video play-through.
	function setActive(loop: VideoLoop | null) {
		commit({ activeLoopId: loop ? loop.id : null })
		controller?.setActiveLoop(loop)
		if (!loop) controller?.setRate(1) // deactivating all loops → back to normal speed (req 2)
		resetStopwatch()
	}
	function toggleActive(loop: VideoLoop) {
		setActive(activeLoopId === loop.id ? null : loop)
	}

	// Restart a loop from its A point (req 3). Activates it if it wasn't already, then re-seeks + plays.
	function restartLoop(loop: VideoLoop) {
		if (activeLoopId !== loop.id) commit({ activeLoopId: loop.id })
		controller?.setActiveLoop(loop, true)
		resetStopwatch()
	}

	function togglePlay() {
		if (!controller) return
		if (playing) controller.pause()
		else controller.play()
	}

	function setLoopRate(loop: VideoLoop, rate: number) {
		updateLoop(loop.id, { rate }) // updateLoop applies rate live when this loop is active
	}

	async function setBound(loop: VideoLoop, which: 'A' | 'B') {
		if (!controller) return
		await whenReady()
		const t = Math.round(Math.max(0, controller.getCurrentTime()) * 1000) / 1000 // ms precision
		setBoundSecs(loop, which, t)
	}

	function setBoundSecs(loop: VideoLoop, which: 'A' | 'B', secs: number) {
		if (which === 'A') updateLoop(loop.id, { startSec: Math.min(secs, loop.endSec - 0.1) })
		else updateLoop(loop.id, { endSec: Math.max(secs, loop.startSec + 0.1) })
	}

	// ---- 3-box (m / s / ms) timestamp editor per bound (req 2) ----
	type TimePart = 'm' | 's' | 'ms'
	const PART_MAX: Record<TimePart, number> = { m: 999, s: 59, ms: 999 }

	// Seconds → { m, s, ms }, mirroring formatMmssMs's flooring so the boxes match the label.
	function splitTime(totalSec: number) {
		const totalMs = Math.max(0, Math.floor(totalSec * 1000))
		return {
			m: Math.floor(totalMs / 60000),
			s: Math.floor((totalMs % 60000) / 1000),
			ms: totalMs % 1000
		}
	}
	// Highlight the whole number on focus so the user types over it instead of deleting (req 2).
	function selectAllOnFocus(e: FocusEvent) {
		;(e.target as HTMLInputElement).select()
	}
	function commitPart(loop: VideoLoop, which: 'A' | 'B', part: TimePart, e: Event) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = 0
		v = Math.min(PART_MAX[part], Math.max(0, v)) // clamp to the box's range
		el.value = String(v) // reflect the clamp even when the model value is unchanged
		const parts = { ...splitTime(which === 'A' ? loop.startSec : loop.endSec), [part]: v }
		setBoundSecs(loop, which, parts.m * 60 + parts.s + parts.ms / 1000)
	}

	async function addLoop() {
		let start = 0
		let end = 10
		if (controller) {
			await whenReady()
			start = Math.floor(controller.getCurrentTime())
			const dur = controller.getDuration()
			end = dur ? Math.min(start + 10, dur) : start + 10
		}
		const loop = makeVideoLoop(video.loops.length, start, end, 1)
		commit({ loops: [...video.loops, loop] })
		expandedLoopId = loop.id
	}

	function deleteLoop(id: string) {
		const wasActive = activeLoopId === id
		commit({
			loops: video.loops.filter((l) => l.id !== id),
			...(wasActive ? { activeLoopId: null } : {})
		})
		if (wasActive) {
			controller?.setActiveLoop(null)
			controller?.setRate(1) // deleting the active loop → play through at normal speed (req 2)
			resetStopwatch()
		}
	}

	function setPreservesPitch(value: boolean) {
		commit({ preservesPitch: value })
		if (controller instanceof FileController) controller.setPreservesPitch(value)
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Player surface -->
	{#if missingBlob}
		<div class="rounded bg-amber-50 border border-amber-300 text-amber-900 text-sm p-3">
			Media file not found in this browser{video.source.kind === 'file'
				? ` (“${video.source.fileName}”)`
				: ''}. Re-select it in the exercise editor.
		</div>
	{:else if errorMsg}
		<div class="rounded bg-red-50 border border-red-300 text-red-900 text-sm p-3">{errorMsg}</div>
	{/if}

	{#if isYouTube}
		<div class="w-full aspect-video bg-black rounded overflow-hidden">
			<div bind:this={mountEl} class="w-full h-full"></div>
		</div>
	{:else if isAudio}
		<!-- svelte-ignore a11y_media_has_caption -->
		<audio bind:this={mediaEl} controls class="w-full"></audio>
	{:else}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={mediaEl} controls class="w-full aspect-video bg-black rounded"></video>
	{/if}

	<!-- File-only: pitch preservation -->
	{#if video.source.kind === 'file'}
		<label class="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={video.preservesPitch ?? true}
				onchange={(e) => setPreservesPitch((e.target as HTMLInputElement).checked)}
			/>
			Keep pitch when slowed (uncheck for raw pitch-shift)
		</label>
	{/if}

	<!-- Run-mode: stopwatch + global play/pause -->
	{#if mode === 'run'}
		<div class="flex items-center gap-3">
			<button class="btn btn-sm btn-primary" onclick={togglePlay} disabled={!!missingBlob}>
				{playing ? '⏸ Pause' : '▶ Play'}
			</button>
			<div class="text-sm">
				<span class="opacity-60">Playing:</span>
				<span class="font-mono tabular-nums text-lg">{formatMmssMs(stopwatchSec)}</span>
				<span class="opacity-60"
					>· {activeLoopId
						? video.loops.find((l) => l.id === activeLoopId)?.label
						: 'full video'}</span
				>
			</div>
		</div>
		<!-- Always render a hint line, and reserve two lines' height, so activating/deactivating a loop
			 never changes the component height — even if the messages wrap differently (req 1). -->
		<div class="min-h-[2.5rem] text-sm opacity-50">
			{#if video.loops.length === 0}
				<p>No loops yet — add them in the exercise editor.</p>
			{:else if activeLoopId === null}
				<p>Playing through (loops at the end). Activate a loop below to practice it.</p>
			{:else}
				<p>
					Looping “{video.loops.find((l) => l.id === activeLoopId)?.label}” — deactivate to play
					through.
				</p>
			{/if}
		</div>
	{/if}

	<!-- A/B timestamp as m / s / ms boxes (req 2). Select-all on focus, clamped per box. -->
	{#snippet boundBoxes(loop: VideoLoop, which: 'A' | 'B', label: string)}
		{@const parts = splitTime(which === 'A' ? loop.startSec : loop.endSec)}
		<div class="flex flex-col gap-0.5">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">{label}</span>
			<div class="flex items-end gap-1 flex-wrap">
				<label class="flex items-end gap-0.5">
					<input
						type="text"
						inputmode="numeric"
						value={parts.m}
						onfocus={selectAllOnFocus}
						onchange={(e) => commitPart(loop, which, 'm', e)}
						class="input input-xs input-bordered bg-white border-[#02343F]/30 w-12 text-center"
					/>
					<span class="text-[0.65rem] opacity-50 pb-1.5">m</span>
				</label>
				<label class="flex items-end gap-0.5">
					<input
						type="text"
						inputmode="numeric"
						value={parts.s}
						onfocus={selectAllOnFocus}
						onchange={(e) => commitPart(loop, which, 's', e)}
						class="input input-xs input-bordered bg-white border-[#02343F]/30 w-12 text-center"
					/>
					<span class="text-[0.65rem] opacity-50 pb-1.5">s</span>
				</label>
				<label class="flex items-end gap-0.5">
					<input
						type="text"
						inputmode="numeric"
						value={parts.ms}
						onfocus={selectAllOnFocus}
						onchange={(e) => commitPart(loop, which, 'ms', e)}
						class="input input-xs input-bordered bg-white border-[#02343F]/30 w-14 text-center"
					/>
					<span class="text-[0.65rem] opacity-50 pb-1.5">ms</span>
				</label>
				<button class="btn btn-xs btn-outline" onclick={() => setBound(loop, which)}>@now</button>
			</div>
		</div>
	{/snippet}

	<!-- Loop list (foldable rows) -->
	<div class="flex flex-col gap-1.5">
		{#each video.loops as loop, i (loop.id)}
			{@const expanded = expandedLoopId === loop.id}
			<div
				class="rounded border {activeLoopId === loop.id
					? 'border-[#02343F] bg-[#02343F]/5'
					: 'border-[#02343F]/20 bg-white'}"
			>
				<!-- Row header -->
				<div class="flex items-center gap-1.5 p-1.5">
					<button
						class="btn btn-xs shrink-0 w-20 {activeLoopId === loop.id
							? 'btn-primary'
							: 'btn-outline'}"
						onclick={() => toggleActive(loop)}
						aria-pressed={activeLoopId === loop.id}
						title={activeLoopId === loop.id ? 'Tap to deactivate' : 'Tap to activate'}
						>{activeLoopId === loop.id ? 'Active' : 'Activate'}</button
					>
					{#if mode === 'run'}
						<button
							class="btn btn-xs btn-ghost shrink-0"
							onclick={() => restartLoop(loop)}
							disabled={!!missingBlob || !ready}
							title="Start this loop from the beginning"
							aria-label="Start loop from beginning">⏮</button
						>
					{/if}
					<button
						class="flex-1 text-left min-w-0"
						onclick={() => (expandedLoopId = expanded ? null : loop.id)}
					>
						<div class="font-medium truncate">{loop.label}</div>
						<div class="text-xs opacity-60">
							{formatMmssMs(loop.startSec)}–{formatMmssMs(loop.endSec)} · {loop.rate}×
						</div>
					</button>
					<button
						class="btn btn-xs btn-ghost shrink-0"
						onclick={() => (expandedLoopId = expanded ? null : loop.id)}
						aria-label="Toggle settings">{expanded ? '▲' : '▼'}</button
					>
					<button
						class="btn btn-xs btn-square btn-ghost btn-error shrink-0"
						onclick={() => deleteLoop(loop.id)}
						aria-label="Delete loop">✕</button
					>
				</div>

				<!-- Expanded settings -->
				{#if expanded}
					<div class="border-t border-[#02343F]/10 p-2 flex flex-col gap-2">
						<input
							type="text"
							value={loop.label}
							oninput={(e) => updateLoop(loop.id, { label: (e.target as HTMLInputElement).value })}
							placeholder="Loop name"
							class="input input-xs input-bordered bg-white border-[#02343F]/30"
						/>
						<div class="flex flex-col gap-2">
							{@render boundBoxes(loop, 'A', 'A (start)')}
							{@render boundBoxes(loop, 'B', 'B (end)')}
						</div>
						<!-- Per-loop speed -->
						<div class="flex flex-col gap-1">
							<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Speed</span>
							{#if isYouTube}
								<div class="flex flex-wrap gap-1">
									{#each YT_PLAYBACK_RATES as r}
										<button
											class="btn btn-xs {loop.rate === r ? 'btn-primary' : 'btn-outline'}"
											onclick={() => setLoopRate(loop, r)}>{r}×</button
										>
									{/each}
								</div>
							{:else}
								<div class="flex items-center gap-2">
									<input
										type="range"
										min={FILE_RATE_RANGE.min}
										max={FILE_RATE_RANGE.max}
										step={FILE_RATE_RANGE.step}
										value={loop.rate}
										oninput={(e) =>
											setLoopRate(loop, parseFloat((e.target as HTMLInputElement).value))}
										class="range range-xs flex-1"
									/>
									<span class="font-mono text-sm w-12 text-right">{loop.rate.toFixed(2)}×</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<button class="btn btn-sm btn-outline self-start" onclick={addLoop} disabled={!!missingBlob}>
		+ Add loop {ready ? 'from current time' : ''}
	</button>
	{#if mode === 'edit' && video.source.kind === 'file'}
		<p class="text-xs opacity-50">
			Note: exporting this routine to a file won't include the media.
		</p>
	{/if}
</div>
