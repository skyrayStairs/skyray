<script lang="ts">
	import { makeFretboard, type Exercise, type FretboardConfig, type VideoConfig } from '$lib/types/guitar'
	import { formatMmss, parseMmss } from '$lib/utils/time'
	import { uid } from '$lib/utils/id'
	import { parseYouTubeId } from '$lib/video/parseId'
	import { putVideoBlob, deleteVideoBlob } from '$lib/storage/videoBlobs'
	import VideoLooper from './VideoLooper.svelte'
	import MetronomeSettings from './MetronomeSettings.svelte'
	import FretboardSettings from './FretboardSettings.svelte'

	let {
		exercise,
		index,
		canMoveUp,
		canMoveDown,
		onUpdate,
		onRemove,
		onMoveUp,
		onMoveDown
	}: {
		exercise: Exercise
		index: number
		canMoveUp: boolean
		canMoveDown: boolean
		onUpdate: (patch: Partial<Exercise>) => void
		onRemove: () => void
		onMoveUp: () => void
		onMoveDown: () => void
	} = $props()

	// Local text mirror for the mm:ss field; the canonical value is durationSec.
	let durationText = $state(formatMmss(exercise.durationSec))

	function commitDuration() {
		const secs = parseMmss(durationText)
		if (secs === null) {
			durationText = formatMmss(exercise.durationSec) // reject: restore last good value
			return
		}
		onUpdate({ durationSec: secs })
		durationText = formatMmss(secs)
	}

	// ---- video loop ----
	let ytUrl = $state('')
	let videoErr = $state('')

	function addYouTube() {
		const id = parseYouTubeId(ytUrl)
		if (!id) {
			videoErr = 'Could not read a YouTube link.'
			return
		}
		videoErr = ''
		ytUrl = ''
		onUpdate({ video: { source: { kind: 'youtube', videoId: id }, loops: [] } })
	}

	async function addFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		input.value = ''
		if (!file) return
		const fileId = uid()
		try {
			await putVideoBlob(fileId, file) // store bytes BEFORE writing the reference
		} catch {
			videoErr = 'Could not store the video (storage full?).'
			return
		}
		videoErr = ''
		onUpdate({
			video: {
				source: { kind: 'file', fileId, fileName: file.name },
				loops: [],
				preservesPitch: true
			}
		})
	}

	async function removeVideo() {
		const v = exercise.video
		if (v?.source.kind === 'file') {
			try {
				await deleteVideoBlob(v.source.fileId)
			} catch {
				/* ignore */
			}
		}
		onUpdate({ video: undefined })
	}

	function updateVideo(next: VideoConfig) {
		onUpdate({ video: next })
	}

	// ---- fretboard ----
	function makeFretboardExercise() {
		onUpdate({ fretboard: makeFretboard('chord') })
	}
	function updateFretboard(patch: Partial<FretboardConfig>) {
		onUpdate({ fretboard: { ...(exercise.fretboard as FretboardConfig), ...patch } })
	}
	function removeFretboard() {
		onUpdate({ fretboard: undefined })
	}
</script>

<div class="rounded-lg border-2 border-[#02343F]/20 bg-white p-2 sm:p-3 shadow-md flex flex-col gap-2">
	<!-- Header: order number, name, reorder + remove -->
	<div class="flex items-center gap-1.5">
		<span class="text-xs opacity-50 w-5 shrink-0 text-center">{index + 1}</span>
		<input
			type="text"
			value={exercise.name}
			oninput={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
			placeholder="Exercise name"
			class="input input-xs sm:input-sm input-bordered flex-1 bg-white border-[#02343F]/30 font-medium"
		/>
		<button
			class="btn btn-xs btn-square btn-ghost shrink-0"
			onclick={onMoveUp}
			disabled={!canMoveUp}
			aria-label="Move up">▲</button
		>
		<button
			class="btn btn-xs btn-square btn-ghost shrink-0"
			onclick={onMoveDown}
			disabled={!canMoveDown}
			aria-label="Move down">▼</button
		>
		<button
			class="btn btn-xs btn-square btn-ghost btn-error shrink-0"
			onclick={onRemove}
			aria-label="Remove exercise">✕</button
		>
	</div>

	{#if exercise.video}
		<!-- Video loop exercise: metronome/timer don't apply -->
		<VideoLooper video={exercise.video} mode="edit" onChange={updateVideo} />
		<button class="btn btn-xs btn-outline btn-error self-start" onclick={removeVideo}
			>Remove video</button
		>
	{:else if exercise.fretboard}
		<!-- Fretboard exercise: metronome/timer don't apply -->
		<FretboardSettings config={exercise.fretboard} onUpdate={updateFretboard} />
		<button class="btn btn-xs btn-outline btn-error self-start" onclick={removeFretboard}
			>Remove fretboard</button
		>
	{:else}
		<!-- Timer -->
		<label class="flex flex-col gap-0.5 max-w-[8rem]">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Timer</span>
			<input
				type="text"
				inputmode="numeric"
				bind:value={durationText}
				onchange={commitDuration}
				onblur={commitDuration}
				placeholder="m:ss"
				class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 text-center"
			/>
		</label>

		<MetronomeSettings {exercise} {onUpdate} />

		<!-- Convert to a video loop exercise -->
		<div class="flex flex-col gap-1 border-t border-[#02343F]/10 pt-2">
			<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Or make this a video loop</span>
			<div class="flex gap-1.5 items-center flex-wrap">
				<input
					type="text"
					bind:value={ytUrl}
					placeholder="Paste YouTube link"
					class="input input-xs input-bordered flex-1 bg-white border-[#02343F]/30 min-w-[10rem]"
				/>
				<button class="btn btn-xs btn-outline shrink-0" onclick={addYouTube}>Add YouTube</button>
				<label class="btn btn-xs btn-outline cursor-pointer shrink-0">
					Local file
					<input type="file" accept="video/*" class="hidden" onchange={addFile} />
				</label>
			</div>
			<button class="btn btn-xs btn-outline self-start mt-1" onclick={makeFretboardExercise}
				>Make fretboard diagram</button
			>
		</div>
	{/if}

	{#if videoErr}
		<p class="text-xs text-red-600">{videoErr}</p>
	{/if}
</div>
