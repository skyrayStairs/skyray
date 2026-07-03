<script lang="ts">
	import { makeFretboard, type Exercise, type FretboardConfig, type VideoConfig } from '$lib/types/guitar'
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
		dragging = false,
		dropTarget = false,
		onUpdate,
		onRemove,
		onMoveUp,
		onMoveDown,
		onDragStart,
		onDragOver,
		onDrop,
		onDragEnd
	}: {
		exercise: Exercise
		index: number
		canMoveUp: boolean
		canMoveDown: boolean
		dragging?: boolean // this card is the one being dragged
		dropTarget?: boolean // this card is the current drag-over drop slot
		onUpdate: (patch: Partial<Exercise>) => void
		onRemove: () => void
		onMoveUp: () => void
		onMoveDown: () => void
		onDragStart?: (e: DragEvent) => void
		onDragOver?: (e: DragEvent) => void
		onDrop?: (e: DragEvent) => void
		onDragEnd?: () => void
	} = $props()

	// ---- timer (m / s boxes, mirroring the loop A/B editor minus the ms box) ----
	// Canonical value is durationSec; the boxes are a live view of it. undefined enabled = on (legacy).
	const timerOn = $derived(exercise.timerEnabled !== false)
	const durParts = $derived({
		m: Math.floor(Math.max(0, Math.floor(exercise.durationSec)) / 60),
		s: Math.max(0, Math.floor(exercise.durationSec)) % 60
	})
	const PART_MAX: Record<'m' | 's', number> = { m: 999, s: 59 }

	// Highlight the whole number on focus so the user types over it instead of deleting.
	function selectAllOnFocus(e: FocusEvent) {
		;(e.target as HTMLInputElement).select()
	}
	function commitPart(part: 'm' | 's', e: Event) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = 0
		v = Math.min(PART_MAX[part], Math.max(0, v)) // clamp to the box's range
		el.value = String(v) // reflect the clamp even when the model value is unchanged
		const parts = { ...durParts, [part]: v }
		onUpdate({ durationSec: parts.m * 60 + parts.s })
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
			videoErr = 'Could not store the media (storage full?).'
			return
		}
		videoErr = ''
		const mediaKind = file.type.startsWith('audio/') ? 'audio' : 'video' // empty MIME → video (plays audio too)
		onUpdate({
			video: {
				source: { kind: 'file', fileId, fileName: file.name, mediaKind },
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

<div
	data-exercise-card
	role="listitem"
	ondragover={onDragOver}
	ondrop={onDrop}
	class="rounded-lg border-2 bg-white p-2 sm:p-3 shadow-md flex flex-col gap-2 transition-[opacity,box-shadow]
		{dragging ? 'opacity-40' : ''}
		{dropTarget ? 'border-[#02343F] ring-2 ring-[#02343F]' : 'border-[#02343F]/20'}"
>
	<!-- Header: drag handle, order number, name, reorder + remove -->
	<div class="flex items-center gap-1.5">
		<span
			draggable="true"
			ondragstart={onDragStart}
			ondragend={onDragEnd}
			class="cursor-grab active:cursor-grabbing select-none shrink-0 px-0.5 leading-none text-[#02343F]/40 hover:text-[#02343F]/70"
			role="button"
			tabindex="-1"
			aria-label="Drag to reorder"
			title="Drag to reorder">⠿</span
		>
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

	<!-- Timer applies to every exercise type; opt-out disables the run-mode countdown for this step. -->
	{#snippet timerField()}
		<div class="flex flex-col gap-1">
			<label class="flex items-center gap-1.5 cursor-pointer w-fit">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={timerOn}
					onchange={(e) => onUpdate({ timerEnabled: (e.target as HTMLInputElement).checked })}
				/>
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Timer</span>
			</label>
			{#if timerOn}
				<div class="flex items-end gap-1">
					<label class="flex items-end gap-0.5">
						<input
							type="text"
							inputmode="numeric"
							value={durParts.m}
							onfocus={selectAllOnFocus}
							onchange={(e) => commitPart('m', e)}
							class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 w-12 text-center"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">m</span>
					</label>
					<label class="flex items-end gap-0.5">
						<input
							type="text"
							inputmode="numeric"
							value={durParts.s}
							onfocus={selectAllOnFocus}
							onchange={(e) => commitPart('s', e)}
							class="input input-xs sm:input-sm input-bordered bg-white border-[#02343F]/30 w-12 text-center"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">s</span>
					</label>
				</div>
			{:else}
				<span class="text-xs opacity-50">No timer — advance manually in run mode.</span>
			{/if}
		</div>
	{/snippet}

	{@render timerField()}

	{#if exercise.video}
		<VideoLooper video={exercise.video} mode="edit" onChange={updateVideo} />
		<button class="btn btn-xs btn-outline btn-error self-start" onclick={removeVideo}
			>Remove video</button
		>
	{:else if exercise.fretboard}
		<FretboardSettings config={exercise.fretboard} onUpdate={updateFretboard} />
		<button class="btn btn-xs btn-outline btn-error self-start" onclick={removeFretboard}
			>Remove fretboard</button
		>
	{:else}
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
					<input type="file" accept="video/*,audio/*" class="hidden" onchange={addFile} />
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
