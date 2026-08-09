<script lang="ts">
	import { onMount } from 'svelte'
	import {
		DEFAULT_LOOP_SEC,
		DEFAULT_LOOP_REPS,
		FILE_RATE_RANGE,
		YT_RATE_RANGE,
		PENDING_LOOP_END,
		DEFAULT_SPEED_TRAINER,
		loopReps,
		makeVideoLoop,
		rateAtPass,
		speedRampReps,
		type VideoConfig,
		type VideoLoop,
		type LoopSizing,
		type SpeedTrainer
	} from '$lib/types/guitar'
	import { formatMmss, formatMmssMs } from '$lib/utils/time'
	import { getVideoBlob } from '$lib/storage/videoBlobs'
	import type { LoopPlayer } from '$lib/video/LoopPlayer'
	import { YouTubeController } from '$lib/video/youtubeController'
	import { FileController } from '$lib/video/fileController'

	let {
		video,
		mode,
		onChange,
		finishing = false,
		onFinished,
		runLoopId = undefined,
		runLoopNonce = 0,
		onLoopBoundary = undefined,
		onRestartLoop = undefined,
		onJumpLoop = undefined,
		capSec = undefined
	}: {
		video: VideoConfig
		mode: 'edit' | 'run'
		onChange: (next: VideoConfig) => void
		// Run-mode: the routine timer ran out and is waiting for the current loop to finish (req 7).
		finishing?: boolean
		onFinished?: () => void
		// Run-mode timed-loop sequencing (page-driven): which loop to play, and a nonce that bumps every
		// time the page wants the current loop (re)started from A (loop switch OR a new repeat).
		runLoopId?: string | null
		runLoopNonce?: number
		// Run-mode 'reps' sizing: fires each time the active loop wraps A→B so the page can count reps.
		onLoopBoundary?: () => void
		// Run-mode timed sequence: the ⏮ on the current loop asks the page to restart it from the top.
		onRestartLoop?: () => void
		// Run-mode timed sequence: ▶ on a queued loop asks the page to jump the sequence to that loop.
		onJumpLoop?: (id: string) => void
		// Edit-mode readability: the exercise cap (seconds) if opted in, else null — used in the loop's
		// plain-English summary. VideoLooper only sees the VideoConfig, so the page/card feeds this in.
		capSec?: number | null
	} = $props()

	let mountEl = $state<HTMLDivElement>() // YouTube replaces this with its iframe
	let mediaEl = $state<HTMLMediaElement>() // native <video> or <audio> for local files
	let controller: LoopPlayer | null = null
	let ready = $state(false) // controller built and usable

	let errorMsg = $state('')
	let missingBlob = $state(false)
	let playing = $state(false)
	let expandedLoopId = $state<string | null>(null)

	// ---- drag-to-reorder loops (edit mode). The loop list order IS the run-sequence order, and
	// activeLoopId is id-based, so reordering never breaks the active/running loop.
	let dragIndex = $state<number | null>(null)
	let dragOverIndex = $state<number | null>(null)

	// The active loop is persisted on the config (shared single-active flag).
	const activeLoopId = $derived(video.activeLoopId ?? null)

	// Stopwatch = time the video has actually been PLAYING since the current loop was activated.
	let stopwatchSec = $state(0)
	let stopwatchBase = 0
	let segStart = 0
	let swRaf: number | null = null // rAF id driving the ms stopwatch

	// Run mode with the page driving a timed loop sequence: the manual Activate/restart controls are
	// suppressed (the page owns which loop plays), and mutating the config mid-run is avoided.
	const sequencing = $derived(mode === 'run' && (video.timedLoops ?? false))
	const isYouTube = $derived(video.source.kind === 'youtube')
	const isAudio = $derived(video.source.kind === 'file' && video.source.mediaKind === 'audio')

	// The loop the player is actually playing right now: the page-driven one in a run sequence, else the
	// persisted active loop. Edits to THIS loop (bounds + rate) apply to the live player, so speed can be
	// changed mid-exercise in a timed sequence (req 2).
	const liveLoopId = $derived(sequencing ? (runLoopId ?? null) : activeLoopId)
	const runLoop = $derived(video.loops.find((l) => l.id === runLoopId) ?? null)
	const liveLoop = $derived(video.loops.find((l) => l.id === liveLoopId) ?? null)

	// ---- speed trainer -------------------------------------------------------
	// Passes the live loop has completed since it (re)started. Counted here rather than on the page
	// so the ramp also works for manually activated loops (no timed sequence), and reset wherever a
	// loop is (re)armed. The resulting rate is applied to the player only — never committed, or every
	// bump would rewrite the routine.
	// ponytail: counts every wrap, including ones the page ignores while the routine is paused (pausing
	// the routine doesn't pause the player), so a paused-but-playing loop ramps ahead of the page's own
	// rep count. Share one counter via a prop if that drift ever shows up in practice.
	let passCount = $state(0)
	const trainerRate = $derived(liveLoop?.speed ? rateAtPass(liveLoop.speed, passCount) : null)

	function armTrainer(loop: VideoLoop | null) {
		passCount = 0
		// setActiveLoop() has just reset the player to loop.rate, so a trained loop needs its ramp rate
		// put back. Passed explicitly: the derived liveLoop still lags a commit at these call sites.
		if (loop?.speed) controller?.setRate(rateAtPass(loop.speed, 0))
	}
	// How many more passes until the next bump, or null once the ramp is at its end rate.
	const passesToBump = $derived.by(() => {
		const sp = liveLoop?.speed
		if (!sp || trainerRate == null || Math.abs(trainerRate - sp.endRate) < 1e-6) return null
		const every = Math.max(1, Math.floor(sp.everyReps))
		return every - (passCount % every)
	})

	// ---- graceful finish (req 7): when the routine timer runs out, don't cut the loop off mid-lick.
	// If an A-B loop is actively playing, wait for the next B→A wrap; otherwise finish immediately.
	let awaitingBoundary = $state(false)
	$effect(() => {
		if (!finishing) {
			awaitingBoundary = false
			return
		}
		// A loop is playing if the persisted flag is set OR the page is driving one (run sequence, uncommitted).
		const loopPlaying = activeLoopId != null || (mode === 'run' && runLoopId != null)
		if (playing && loopPlaying) {
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
			// Every A→B wrap. Report it so the page can count reps ('reps' sizing); the graceful-finish
			// wait (cap expiry / routine timer) piggybacks on the same boundary.
			passCount += 1
			if (liveLoop?.speed) controller?.setRate(rateAtPass(liveLoop.speed, passCount))
			if (mode === 'run') onLoopBoundary?.()
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
		await fillPendingLoopEnd()
		if (mode === 'run' && runLoopId != null) {
			// Timed-loop sequencing: the page owns which loop plays. Start it from A (autoplay).
			lastRunNonce = runLoopNonce
			applyRunLoop()
		} else {
			// Apply the persisted active loop (or whole-video play-through when none), no autoplay.
			const active = video.loops.find((l) => l.id === activeLoopId) ?? null
			controller.setActiveLoop(active, false)
			armTrainer(active)
		}
	}

	// A source added in the editor seeds one whole-media loop (see PENDING_LOOP_END) whose end can
	// only be filled once the player reports a duration — YouTube's getDuration() is often still 0
	// right after onReady, so poll briefly rather than write a 0-length loop.
	async function fillPendingLoopEnd() {
		const pending = video.loops.find((l) => l.endSec === PENDING_LOOP_END)
		if (!pending || !controller) return
		for (let i = 0; i < 10; i++) {
			const dur = controller.getDuration()
			if (dur > 0) {
				updateLoop(pending.id, { endSec: dur })
				return
			}
			await new Promise((r) => setTimeout(r, 150))
		}
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
		// Apply edits to the live player when they target the loop currently playing (bounds + rate),
		// no re-seek. liveLoopId covers both manual practice and a page-driven run sequence (req 2).
		if (id === liveLoopId) {
			const updated = loops.find((l) => l.id === id)
			if (updated) {
				controller?.refreshLoop(updated)
				if (patch.rate !== undefined && !updated.speed) controller?.setRate(updated.rate)
				// Editing the ramp (or switching it off) re-rates the live loop without restarting it.
				if ('speed' in patch)
					controller?.setRate(updated.speed ? rateAtPass(updated.speed, passCount) : updated.rate)
			}
		}
	}

	// ---- timed-loop sequence (edit) ----
	const timedLoops = $derived(video.timedLoops ?? false)
	function setTimedLoops(v: boolean) {
		commit({ timedLoops: v })
	}
	// Exercise-wide: are loops sized by rep count, or by a wall-clock timer? (see VideoConfig.loopSizing)
	const loopSizing = $derived<LoopSizing>(video.loopSizing ?? 'reps')
	function setLoopSizing(v: LoopSizing) {
		commit({ loopSizing: v })
	}
	// How long one A→B pass of this loop takes at its rate (for the "~m:ss" hint in reps mode).
	function loopPassSec(loop: VideoLoop): number {
		const span = Math.max(0, loop.endSec - loop.startSec)
		return span / Math.max(0.05, loop.rate)
	}
	// Wall-clock time all of a loop's passes take. A trained loop's passes each run at their own ramp rate,
	// so sum them instead of multiplying one pass.
	function loopRepsSec(loop: VideoLoop): number {
		if (!loop.speed) return loopReps(loop) * loopPassSec(loop)
		const span = Math.max(0, loop.endSec - loop.startSec)
		let total = 0
		for (let p = 0; p < loopReps(loop); p++)
			total += span / Math.max(0.05, rateAtPass(loop.speed, p))
		return total
	}
	function rampPhrase(sp: SpeedTrainer): string {
		const sign = sp.endRate < sp.startRate ? '−' : '+'
		return `${sp.startRate.toFixed(2)}× → ${sp.endRate.toFixed(2)}×, ${sign}${sp.stepRate.toFixed(2)} every ${sp.everyReps} rep${sp.everyReps === 1 ? '' : 's'}`
	}

	// Plain-English summary of what this loop does in a run-mode sequence: how it's sized, where it goes
	// next, and (if set) the exercise cap that can cut it short. Drives the readability the user asked for.
	function loopSummary(loop: VideoLoop, i: number): string {
		const isLast = i === video.loops.length - 1
		const next = isLast ? 'next exercise' : 'next loop'
		const ramp = loop.speed ? `, ramping ${rampPhrase(loop.speed)}` : ''
		let head: string
		if (loopSizing === 'reps') {
			head = `Plays A→B ${loopReps(loop)}× (~${formatMmss(Math.round(loopRepsSec(loop)))})${ramp}, then ${next}`
		} else {
			head = `Loops A→B for ${formatMmss(loop.durationSec ?? DEFAULT_LOOP_SEC)}${ramp}, then ${next}`
		}
		return capSec != null
			? `${head} — or until the ${formatMmss(capSec)} exercise timer ends`
			: head
	}
	function loopDurParts(loop: VideoLoop) {
		const whole = Math.max(0, Math.floor(loop.durationSec ?? DEFAULT_LOOP_SEC))
		return { m: Math.floor(whole / 60), s: whole % 60 }
	}
	const DUR_PART_MAX: Record<'m' | 's', number> = { m: 999, s: 59 }
	function commitLoopDur(loop: VideoLoop, part: 'm' | 's', e: Event) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = 0
		v = Math.min(DUR_PART_MAX[part], Math.max(0, v))
		el.value = String(v)
		const parts = { ...loopDurParts(loop), [part]: v }
		updateLoop(loop.id, { durationSec: parts.m * 60 + parts.s })
	}
	function commitLoopReps(loop: VideoLoop, e: Event) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = DEFAULT_LOOP_REPS
		v = Math.max(1, v)
		el.value = String(v)
		updateLoop(loop.id, { repeatCount: v })
	}

	// ---- run-mode command: play the page-selected loop from A, without persisting (commit) it ----
	let lastRunNonce = -1
	function applyRunLoop() {
		if (mode !== 'run' || !controller || runLoopId == null) return
		const loop = video.loops.find((l) => l.id === runLoopId)
		if (loop) {
			controller.setActiveLoop(loop, true) // re-seek to A + play; no commit → config untouched
			armTrainer(loop) // a page-driven (re)start restarts the ramp too
		}
	}
	$effect(() => {
		// React whenever the page bumps the nonce (loop switch or new repeat). Guard so unrelated
		// reactive changes don't re-trigger, and so we only fire once the controller exists.
		if (mode !== 'run' || runLoopNonce === lastRunNonce) return
		if (!ready) return // buildController applies the initial loop once ready (see below)
		lastRunNonce = runLoopNonce
		applyRunLoop()
	})

	// ---- loop actions ----
	// Activate/deactivate is a shared flag: only one loop holds it. null → whole-video play-through.
	function setActive(loop: VideoLoop | null) {
		commit({ activeLoopId: loop ? loop.id : null })
		controller?.setActiveLoop(loop)
		if (!loop) controller?.setRate(1) // deactivating all loops → back to normal speed (req 2)
		armTrainer(loop)
		resetStopwatch()
	}
	function toggleActive(loop: VideoLoop) {
		setActive(activeLoopId === loop.id ? null : loop)
	}

	// Restart a loop from its A point (req 3). Activates it if it wasn't already, then re-seeks + plays.
	function restartLoop(loop: VideoLoop) {
		if (activeLoopId !== loop.id) commit({ activeLoopId: loop.id })
		controller?.setActiveLoop(loop, true)
		armTrainer(loop) // ⏮ restarts the ramp from its start rate, not mid-climb
		resetStopwatch()
	}

	function togglePlay() {
		if (!controller) return
		if (playing) controller.pause()
		else controller.play()
	}

	// YouTube's embed is quantized to 0.05 and floored at 0.25; a native <video> takes anything.
	const rateRange = $derived(isYouTube ? YT_RATE_RANGE : FILE_RATE_RANGE)
	// A nudge finer than the source's own step would show a rate the player won't actually play.
	const rateNudges = $derived(isYouTube ? [-0.05, 0.05] : [-0.05, -0.01, 0.01, 0.05])

	function setLoopRate(loop: VideoLoop, rate: number) {
		// Round to 2dp before clamping so ±0.01/±0.05 nudges don't accumulate float error.
		const r = Math.min(rateRange.max, Math.max(rateRange.min, Math.round(rate * 100) / 100))
		updateLoop(loop.id, { rate: r }) // updateLoop applies rate live when this loop is active
	}

	// ---- speed trainer (edit) ----
	// Snap a rate onto the source's own grid, so every tier of the ramp is a speed the player can
	// actually play — an off-grid tier on YouTube would display one speed and play a slower one.
	function snapToGrid(v: number): number {
		const { min, max, step } = rateRange
		return Math.round(Math.round(Math.min(max, Math.max(min, v)) / step) * step * 100) / 100
	}
	function setTrainer(loop: VideoLoop, on: boolean) {
		passCount = 0 // a ramp switched on mid-practice starts at its start rate, not mid-climb
		if (!on) return updateLoop(loop.id, { speed: undefined })
		// Seed a ramp that actually climbs: target full speed (or the loop's own rate if it's already
		// above it), starting from wherever the loop was slowed to. A loop still at 1× has nowhere to
		// climb from, so it falls back to the default slow start.
		updateLoop(loop.id, {
			speed: {
				...DEFAULT_SPEED_TRAINER,
				startRate: snapToGrid(loop.rate < 1 ? loop.rate : DEFAULT_SPEED_TRAINER.startRate),
				endRate: snapToGrid(Math.max(loop.rate, 1)),
				stepRate: Math.max(rateRange.step, DEFAULT_SPEED_TRAINER.stepRate)
			}
		})
	}
	function commitTrainer(loop: VideoLoop, field: keyof SpeedTrainer, e: Event) {
		const sp = loop.speed
		if (!sp) return
		const el = e.target as HTMLInputElement
		let v = parseFloat(el.value)
		if (Number.isNaN(v)) v = sp[field]
		if (field === 'everyReps') v = Math.max(1, Math.round(v))
		else if (field === 'stepRate')
			v = Math.round(Math.max(rateRange.step, v) / rateRange.step) * rateRange.step
		else v = snapToGrid(v)
		v = Math.round(v * 100) / 100
		el.value = String(v) // reflect the snap/clamp even when the model value is unchanged
		updateLoop(loop.id, { speed: { ...sp, [field]: v } })
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

	// ---- drag-to-reorder loops ----
	function reorderLoops(from: number, to: number) {
		if (from === to) return
		const next = [...video.loops]
		if (from < 0 || from >= next.length || to < 0 || to >= next.length) return
		const [moved] = next.splice(from, 1)
		next.splice(to, 0, moved) // drop lands the loop at the hovered slot
		commit({ loops: next })
	}
	function onLoopDragStart(e: DragEvent, i: number) {
		e.stopPropagation() // don't let the enclosing ExerciseCard start its own row drag
		dragIndex = i
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', String(i))
		}
	}
	function onLoopDragOver(e: DragEvent, i: number) {
		if (dragIndex === null) return // only react to a loop drag, not a bubbling exercise drag
		e.preventDefault()
		e.stopPropagation()
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
		dragOverIndex = i
	}
	function onLoopDrop(e: DragEvent, i: number) {
		if (dragIndex === null) return
		e.preventDefault()
		e.stopPropagation()
		reorderLoops(dragIndex, i)
		dragIndex = null
		dragOverIndex = null
	}
	function onLoopDragEnd() {
		dragIndex = null
		dragOverIndex = null
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Playback-speed picker for one loop: a slider over the source's own rate range (see rateRange).
		 setLoopRate persists + (via updateLoop/liveLoopId) applies to the player live when this loop plays. -->
	{#snippet speedControl(loop: VideoLoop)}
		<div class="flex items-center gap-2">
			<input
				type="range"
				min={rateRange.min}
				max={rateRange.max}
				step={rateRange.step}
				value={loop.rate}
				oninput={(e) => setLoopRate(loop, parseFloat((e.target as HTMLInputElement).value))}
				class="range range-xs flex-1"
			/>
			<span class="font-mono text-sm w-12 text-right">{loop.rate.toFixed(2)}×</span>
		</div>
		<!-- Exact nudge buttons (the slider is convenient but imprecise). -->
		<div class="flex justify-center gap-1">
			{#each rateNudges as d}
				<button class="btn btn-xs btn-outline" onclick={() => setLoopRate(loop, loop.rate + d)}
					>{d < 0 ? '−' : '+'}{Math.abs(d).toFixed(2)}</button
				>
			{/each}
		</div>
	{/snippet}

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

		<!-- Speed readout for the loop that's actually playing. A speed-trained loop owns its rate (the
			 ramp overwrites it every few passes), so it shows where the climb is instead of a slider. -->
		{#if liveLoop?.speed && trainerRate != null}
			<div class="flex flex-col gap-1">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60"
					>Speed trainer — {liveLoop.label}</span
				>
				<div class="flex items-baseline gap-2 font-mono">
					<span class="text-2xl">{trainerRate.toFixed(2)}×</span>
					<span class="text-sm opacity-60">→ {liveLoop.speed.endRate.toFixed(2)}×</span>
					<span class="text-sm opacity-60 font-sans">
						{#if passesToBump == null}
							· at top speed
						{:else}
							· +{liveLoop.speed.stepRate.toFixed(2)} in {passesToBump} rep{passesToBump === 1
								? ''
								: 's'}
						{/if}
					</span>
				</div>
			</div>
			<!-- Timed sequence: live speed control for the loop the page is currently playing. Adjusting it
				 changes playback speed immediately, mid-exercise (req 2), and sticks for the rest of the run. -->
		{:else if sequencing && runLoop}
			<div class="flex flex-col gap-1">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60"
					>Speed — {runLoop.label}</span
				>
				{@render speedControl(runLoop)}
			</div>
		{/if}
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
						class="input input-xs input-bordered bg-white border-teal/30 w-12 text-center"
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
						class="input input-xs input-bordered bg-white border-teal/30 w-12 text-center"
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
						class="input input-xs input-bordered bg-white border-teal/30 w-14 text-center"
					/>
					<span class="text-[0.65rem] opacity-50 pb-1.5">ms</span>
				</label>
				<button class="btn btn-xs btn-outline" onclick={() => setBound(loop, which)}>@now</button>
			</div>
		</div>
	{/snippet}

	<!-- Timed-loop sequence (edit): auto-advance through loops by reps or a timer in run mode -->
	{#if mode === 'edit'}
		<div class="flex flex-col gap-2">
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={timedLoops}
					onchange={(e) => setTimedLoops((e.target as HTMLInputElement).checked)}
				/>
				Timed loop sequence — auto-advance loops in run mode
			</label>
			{#if timedLoops}
				<!-- Exercise-wide: size every loop by rep count, or by a per-loop timer. -->
				<div class="flex items-center gap-2 pl-6 text-xs">
					<span class="opacity-60">Advance each loop by</span>
					<div class="join">
						<button
							class="btn btn-xs join-item {loopSizing === 'reps' ? 'btn-primary' : 'btn-outline'}"
							onclick={() => setLoopSizing('reps')}>Reps</button
						>
						<button
							class="btn btn-xs join-item {loopSizing === 'timer' ? 'btn-primary' : 'btn-outline'}"
							onclick={() => setLoopSizing('timer')}>Timer</button
						>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Loop list (foldable rows) -->
	<div class="flex flex-col gap-1.5">
		{#each video.loops as loop, i (loop.id)}
			{@const expanded = expandedLoopId === loop.id}
			<div
				role="listitem"
				ondragover={(e) => onLoopDragOver(e, i)}
				ondrop={(e) => onLoopDrop(e, i)}
				class="rounded border transition-opacity {activeLoopId === loop.id
					? 'border-teal bg-teal/5'
					: 'border-teal/20 bg-white'} {dragOverIndex === i && dragIndex !== i
					? 'ring-2 ring-teal'
					: ''} {dragIndex === i ? 'opacity-40' : ''}"
			>
				<!-- Row header -->
				<div class="flex items-center gap-1.5 p-1.5">
					{#if mode === 'edit'}
						<!-- Drag handle: reorder loops = reorder the run sequence. -->
						<span
							draggable="true"
							ondragstart={(e) => onLoopDragStart(e, i)}
							ondragend={onLoopDragEnd}
							class="cursor-grab active:cursor-grabbing select-none shrink-0 px-0.5 leading-none text-teal/40 hover:text-teal/70"
							role="button"
							tabindex="-1"
							aria-label="Drag to reorder loop"
							title="Drag to reorder">⠿</span
						>
					{/if}
					{#if sequencing}
						<!-- Page-driven sequence: the current loop shows a Playing badge + restart; every other
							 loop is a ▶ Play button that jumps the sequence to it (free movement, req 1). -->
						{#if runLoopId === loop.id}
							<span
								class="shrink-0 w-20 text-center text-xs px-1 py-1 rounded bg-teal text-cream"
								>▶ Playing</span
							>
							<button
								class="btn btn-xs btn-ghost shrink-0"
								onclick={() => onRestartLoop?.()}
								disabled={!!missingBlob || !ready}
								title="Start this loop from the beginning"
								aria-label="Start loop from beginning">⏮</button
							>
						{:else}
							<button
								class="btn btn-xs btn-outline shrink-0 w-20"
								onclick={() => onJumpLoop?.(loop.id)}
								disabled={!!missingBlob || !ready}
								title="Jump to this loop">▶ Play</button
							>
						{/if}
					{:else}
						<button
							class="btn btn-xs shrink-0 w-20 {activeLoopId === loop.id
								? 'btn-primary'
								: 'btn-outline'}"
							onclick={() => toggleActive(loop)}
							aria-pressed={activeLoopId === loop.id}
							title={activeLoopId === loop.id ? 'Tap to deactivate' : 'Tap to activate'}
							>{activeLoopId === loop.id ? 'Active' : 'Activate'}</button
						>
						<!-- Restart from A — in run mode (manual practice) and edit mode (preview, req 4). -->
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
							{formatMmssMs(loop.startSec)}–{formatMmssMs(loop.endSec)} · {loop.speed
								? `${loop.speed.startRate.toFixed(2)}→${loop.speed.endRate.toFixed(2)}×`
								: `${loop.rate}×`}
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
					<div class="border-t border-teal/10 p-2 flex flex-col gap-2">
						<input
							type="text"
							value={loop.label}
							oninput={(e) => updateLoop(loop.id, { label: (e.target as HTMLInputElement).value })}
							placeholder="Loop name"
							class="input input-xs input-bordered bg-white border-teal/30"
						/>
						<div class="flex flex-col gap-2">
							{@render boundBoxes(loop, 'A', 'A (start)')}
							{@render boundBoxes(loop, 'B', 'B (end)')}
						</div>
						<!-- Per-loop speed. A speed-trained loop's rate comes from the ramp below instead, so the
							 fixed-speed control is hidden rather than left there doing nothing. -->
						{#if !loop.speed}
							<div class="flex flex-col gap-1">
								<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Speed</span>
								{@render speedControl(loop)}
							</div>
						{/if}

						<!-- Speed trainer: climb from a slow rate to a target as the reps go by. -->
						<div class="flex flex-col gap-1.5">
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									checked={!!loop.speed}
									onchange={(e) => setTrainer(loop, (e.target as HTMLInputElement).checked)}
								/>
								Speed trainer — climb the tempo as you repeat
							</label>
							{#if loop.speed}
								{@const sp = loop.speed}
								<div class="flex items-end gap-1 flex-wrap pl-6">
									<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5">From</span>
									<input
										type="number"
										inputmode="decimal"
										min={rateRange.min}
										max={rateRange.max}
										step={rateRange.step}
										value={sp.startRate}
										onfocus={selectAllOnFocus}
										onchange={(e) => commitTrainer(loop, 'startRate', e)}
										class="input input-xs input-bordered bg-white border-teal/30 w-16 text-center"
									/>
									<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5">× to</span>
									<input
										type="number"
										inputmode="decimal"
										min={rateRange.min}
										max={rateRange.max}
										step={rateRange.step}
										value={sp.endRate}
										onfocus={selectAllOnFocus}
										onchange={(e) => commitTrainer(loop, 'endRate', e)}
										class="input input-xs input-bordered bg-white border-teal/30 w-16 text-center"
									/>
									<span class="text-[0.65rem] opacity-50 pb-1.5">×</span>
								</div>
								<div class="flex items-end gap-1 flex-wrap pl-6">
									<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5">By</span>
									<input
										type="number"
										inputmode="decimal"
										min={rateRange.step}
										max={rateRange.max}
										step={rateRange.step}
										value={sp.stepRate}
										onfocus={selectAllOnFocus}
										onchange={(e) => commitTrainer(loop, 'stepRate', e)}
										class="input input-xs input-bordered bg-white border-teal/30 w-16 text-center"
									/>
									<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5"
										>× every</span
									>
									<input
										type="number"
										inputmode="numeric"
										min="1"
										step="1"
										value={sp.everyReps}
										onfocus={selectAllOnFocus}
										onchange={(e) => commitTrainer(loop, 'everyReps', e)}
										class="input input-xs input-bordered bg-white border-teal/30 w-14 text-center"
									/>
									<span class="text-[0.65rem] opacity-50 pb-1.5">reps (A→B)</span>
								</div>
								<p class="text-[0.7rem] opacity-60 leading-snug pl-6">
									{rampPhrase(sp)} — {speedRampReps(sp)} reps to the top{timedLoops &&
									loopSizing === 'reps'
										? '.'
										: ', then it holds there.'}
								</p>
							{/if}
						</div>

						<!-- Loop sizing (only in a timed sequence): reps OR a timer, chosen exercise-wide above. -->
						{#if timedLoops}
							<div class="flex flex-col gap-1.5">
								{#if loopSizing === 'reps' && loop.speed}
									<!-- The ramp states the loop's length (one tier per `every` reps), so a separate
										 rep count would contradict it — show the derived total instead. -->
									<p class="text-[0.65rem] uppercase tracking-wide opacity-60">
										Plays {loopReps(loop)} times (A→B) — set by the speed trainer
									</p>
								{:else if loopSizing === 'reps'}
									<label class="flex items-end gap-0.5">
										<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5 mr-1"
											>Play</span
										>
										<input
											type="text"
											inputmode="numeric"
											value={loop.repeatCount ?? DEFAULT_LOOP_REPS}
											onfocus={selectAllOnFocus}
											onchange={(e) => commitLoopReps(loop, e)}
											class="input input-xs input-bordered bg-white border-teal/30 w-12 text-center"
											title="How many times to play A→B before advancing"
										/>
										<span class="text-[0.65rem] opacity-50 pb-1.5">times (A→B)</span>
									</label>
								{:else}
									{@const dp = loopDurParts(loop)}
									<div class="flex items-end gap-1">
										<span class="text-[0.65rem] uppercase tracking-wide opacity-60 pb-1.5 mr-1"
											>Loop for</span
										>
										<label class="flex items-end gap-0.5">
											<input
												type="text"
												inputmode="numeric"
												value={dp.m}
												onfocus={selectAllOnFocus}
												onchange={(e) => commitLoopDur(loop, 'm', e)}
												class="input input-xs input-bordered bg-white border-teal/30 w-12 text-center"
											/>
											<span class="text-[0.65rem] opacity-50 pb-1.5">m</span>
										</label>
										<label class="flex items-end gap-0.5">
											<input
												type="text"
												inputmode="numeric"
												value={dp.s}
												onfocus={selectAllOnFocus}
												onchange={(e) => commitLoopDur(loop, 's', e)}
												class="input input-xs input-bordered bg-white border-teal/30 w-12 text-center"
											/>
											<span class="text-[0.65rem] opacity-50 pb-1.5">s</span>
										</label>
									</div>
								{/if}
								<!-- Plain-English recap of this loop's run-mode behavior (the readability ask). -->
								<p class="text-[0.7rem] opacity-60 leading-snug">{loopSummary(loop, i)}</p>
							</div>
						{/if}
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
