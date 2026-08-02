<script lang="ts">
	import {
		exerciseKind,
		makeFretboard,
		makeStep,
		makeVideoLoop,
		PENDING_LOOP_END,
		type Exercise,
		type ExerciseKind,
		type ExerciseStep,
		type FretboardConfig,
		type VideoConfig
	} from '$lib/types/guitar'
	import { uid } from '$lib/utils/id'
	import { parseYouTubeId } from '$lib/video/parseId'
	import { putVideoBlob, deleteVideoBlob } from '$lib/storage/videoBlobs'
	// Lives under gym/ but is feature-agnostic; imported rather than moved to keep the change small.
	import ActionSheet from '$lib/components/ActionSheet.svelte'
	import VideoLooper from './VideoLooper.svelte'
	import MetronomeSettings from './MetronomeSettings.svelte'
	import FretboardSettings from './FretboardSettings.svelte'
	import MultistepEditor from './MultistepEditor.svelte'

	let {
		exercise,
		index,
		canMoveUp,
		canMoveDown,
		dragging = false,
		dropTarget = false,
		moveTargets = [],
		onUpdate,
		onRemove,
		onMoveToRoutine,
		onRun,
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
		moveTargets?: { id: string; name: string }[] // routines this exercise can move to (never the current one)
		onUpdate: (patch: Partial<Exercise>) => void
		onRemove: () => void
		onMoveToRoutine: (routineId: string | null) => void // null → move into a brand-new routine
		onRun: () => void // enter run mode starting from this exercise
		onMoveUp: () => void
		onMoveDown: () => void
		onDragStart?: (e: DragEvent) => void
		onDragOver?: (e: DragEvent) => void
		onDrop?: (e: DragEvent) => void
		onDragEnd?: () => void
	} = $props()

	// ---- exercise kind (type selector) ----
	const kind = $derived(exerciseKind(exercise))
	const KIND_LABELS: { key: ExerciseKind; label: string }[] = [
		{ key: 'metronome', label: 'Metronome' },
		{ key: 'video', label: 'Video / audio' },
		{ key: 'fretboard', label: 'Fretboard' },
		{ key: 'multistep', label: 'Multistep' }
	]
	// Switch the exercise's type: seed the new kind's sub-config, clear the others'.
	async function setKind(next: ExerciseKind) {
		if (next === kind) return
		// Leaving a local-file video frees its stored bytes (same cleanup as removeVideo).
		if (exercise.video?.source.kind === 'file' && next !== 'video') {
			try {
				await deleteVideoBlob(exercise.video.source.fileId)
			} catch {
				/* ignore */
			}
		}
		const patch: Partial<Exercise> = {
			kind: next,
			video: undefined,
			fretboard: undefined,
			steps: undefined,
			metronomeEnabled: undefined // multistep-only opt-in; don't carry a stray true onto other kinds
		}
		if (next === 'fretboard') patch.fretboard = makeFretboard('chord')
		else if (next === 'multistep') patch.steps = [makeStep()]
		onUpdate(patch)
	}
	// ---- move to another routine ----
	// A bottom sheet, not a dropdown, for the reasons ActionSheet documents: this ☰ lives inside a
	// scroller (where an absolute menu gets clipped) at the top of the screen (where a thumb isn't).
	let menuOpen = $state(false)
	const moveActions = $derived([
		...moveTargets.map((r) => ({ label: r.name, onSelect: () => onMoveToRoutine(r.id) })),
		{ label: '+ New routine', onSelect: () => onMoveToRoutine(null) }
	])

	function updateSteps(next: ExerciseStep[]) {
		onUpdate({ steps: next })
	}

	// ---- timer (m / s boxes, mirroring the loop A/B editor minus the ms box) ----
	// Canonical value is durationSec; the boxes are a live view of it. Video/audio: opt-IN (undefined =
	// off) so the exercise-wide cap only appears when asked; other kinds: opt-OUT (undefined = on).
	const timerOn = $derived(kind === 'video' ? exercise.timerEnabled === true : exercise.timerEnabled !== false)
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

	// Audio file extensions used both to un-grey files in the iOS picker (see MEDIA_ACCEPT) and to
	// classify a picked file whose MIME the browser leaves empty (common for m4a/aac on iOS).
	const AUDIO_EXT = /\.(m4a|mp3|aac|wav|ogg|oga|flac|opus|weba)$/i
	// iOS Safari greys out files whose UTI it can't match from a bare `audio/*` — listing explicit
	// extensions makes m4a & friends selectable. Desktop keeps matching on the wildcard MIME types.
	const MEDIA_ACCEPT =
		'video/*,audio/*,.m4a,.mp3,.aac,.wav,.ogg,.oga,.flac,.opus,.weba,.mp4,.m4v,.mov,.webm,.mkv'

	// Seed loop for a newly added source: spans the whole media, so the user starts with a
	// full-length loop instead of an empty list. VideoLooper fills in the end once it knows it.
	function wholeMediaLoop() {
		return makeVideoLoop(0, 0, PENDING_LOOP_END)
	}

	function addYouTube() {
		const id = parseYouTubeId(ytUrl)
		if (!id) {
			videoErr = 'Could not read a YouTube link.'
			return
		}
		videoErr = ''
		ytUrl = ''
		onUpdate({ video: { source: { kind: 'youtube', videoId: id }, loops: [wholeMediaLoop()] } })
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
		// iOS often reports an empty or non-standard MIME for m4a/aac, so fall back to the extension.
		const isAudio =
			file.type.startsWith('audio/') ||
			(!file.type.startsWith('video/') && AUDIO_EXT.test(file.name))
		const mediaKind = isAudio ? 'audio' : 'video'
		onUpdate({
			video: {
				source: { kind: 'file', fileId, fileName: file.name, mediaKind },
				loops: [wholeMediaLoop()],
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
	function updateFretboard(patch: Partial<FretboardConfig>) {
		onUpdate({ fretboard: { ...(exercise.fretboard as FretboardConfig), ...patch } })
	}
</script>

<div
	data-exercise-card
	role="listitem"
	ondragover={onDragOver}
	ondrop={onDrop}
	class="rounded-lg border-2 bg-white p-2 sm:p-3 shadow-md flex flex-col gap-2 transition-[opacity,box-shadow]
		{dragging ? 'opacity-40' : ''}
		{dropTarget ? 'border-teal ring-2 ring-teal' : 'border-teal/20'}"
>
	<!-- Header: drag handle, order number, name, reorder + remove -->
	<div class="flex items-center gap-1.5">
		<span
			draggable="true"
			ondragstart={onDragStart}
			ondragend={onDragEnd}
			class="cursor-grab active:cursor-grabbing select-none shrink-0 px-0.5 leading-none text-teal/40 hover:text-teal/70"
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
			class="input input-xs sm:input-sm input-bordered flex-1 min-w-0 bg-white border-teal/30 font-medium"
		/>
		<button
			class="btn btn-xs btn-square btn-primary shrink-0"
			onclick={onRun}
			aria-label="Start practice from here"
			title="Start practice from here">▶</button
		>
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
			class="btn btn-xs btn-square btn-ghost shrink-0"
			onclick={() => (menuOpen = true)}
			aria-label="Move to another routine"
			title="Move to another routine">☰</button
		>
		<button
			class="btn btn-xs btn-square btn-ghost btn-error shrink-0"
			onclick={onRemove}
			aria-label="Remove exercise">✕</button
		>
	</div>

	<!-- Type selector: picks which kind of exercise this card is (metronome / video / fretboard / multistep). -->
	<label class="flex items-center gap-1.5">
		<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Type</span>
		<select
			class="select select-xs select-bordered bg-white border-teal/30"
			value={kind}
			onchange={(e) => setKind((e.target as HTMLSelectElement).value as ExerciseKind)}
		>
			{#each KIND_LABELS as k (k.key)}
				<option value={k.key}>{k.label}</option>
			{/each}
		</select>
	</label>

	<!-- Timer applies to timed exercise types; multistep uses per-step timers instead (hidden here). -->
	{#snippet timerField()}
		<div class="flex flex-col gap-1">
			<label class="flex items-center gap-1.5 cursor-pointer w-fit">
				<input
					type="checkbox"
					class="checkbox checkbox-xs"
					checked={timerOn}
					onchange={(e) => onUpdate({ timerEnabled: (e.target as HTMLInputElement).checked })}
				/>
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60"
						>{kind === 'video' ? 'Exercise timer (cap)' : 'Timer'}</span
					>
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
							class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 w-12 text-center"
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
							class="input input-xs sm:input-sm input-bordered bg-white border-teal/30 w-12 text-center"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">s</span>
					</label>
				</div>
			{:else}
				<span class="text-xs opacity-50"
					>{kind === 'video'
						? 'No cap — timed loops (if on) drive advancement, else Skip manually.'
						: 'No timer — advance manually in run mode.'}</span
				>
			{/if}
		</div>
	{/snippet}

	{#if kind !== 'multistep'}
		{@render timerField()}
	{/if}

	{#if kind === 'video'}
		{#if exercise.video}
			<VideoLooper
				video={exercise.video}
				mode="edit"
				onChange={updateVideo}
				capSec={timerOn ? exercise.durationSec : null}
			/>
			<button class="btn btn-xs btn-outline btn-error self-start" onclick={removeVideo}
				>Remove video</button
			>
		{:else}
			<!-- Empty video state: add a YouTube link or a local media file -->
			<div class="flex flex-col gap-1">
				<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Video / audio source</span>
				<div class="flex gap-1.5 items-center flex-wrap">
					<input
						type="text"
						bind:value={ytUrl}
						placeholder="Paste YouTube link"
						class="input input-xs input-bordered flex-1 bg-white border-teal/30 min-w-[10rem]"
					/>
					<button class="btn btn-xs btn-outline shrink-0" onclick={addYouTube}>Add YouTube</button>
					<label class="btn btn-xs btn-outline cursor-pointer shrink-0">
						Local file
						<input type="file" accept={MEDIA_ACCEPT} class="hidden" onchange={addFile} />
					</label>
				</div>
			</div>
		{/if}
	{:else if kind === 'fretboard'}
		{#if exercise.fretboard}
			<FretboardSettings config={exercise.fretboard} onUpdate={updateFretboard} />
		{/if}
	{:else if kind === 'multistep'}
		<!-- Metronome is per-step now (opt-in inside each step), not exercise-wide. -->
		<MultistepEditor steps={exercise.steps ?? []} onChange={updateSteps} />
	{:else}
		<MetronomeSettings value={exercise} {onUpdate} />
	{/if}

	{#if videoErr}
		<p class="text-xs text-red-600">{videoErr}</p>
	{/if}
</div>

<ActionSheet
	open={menuOpen}
	title="Move “{exercise.name}” to…"
	actions={moveActions}
	onClose={() => (menuOpen = false)}
/>
