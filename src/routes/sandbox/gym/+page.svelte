<script lang="ts">
	// Gym tracker, five surfaces deep on purpose.
	//
	//   1. this page — the routine library: what exists, and nothing else
	//   2. DaySheet — what a day is, before you commit to it
	//   3./4. DayEditor — planning, full-screen, on a draft you can cancel
	//   5. WorkoutDrawer — lifting, full-screen, on a copy of the plan
	//
	// The split exists because the old single screen made every state visible at once: the plan, the
	// log, the library, the import controls and the lifting rows, all competing for a 390px phone held
	// in one hand between sets. Each surface here answers one question, and the two that get used
	// mid-activity cover the site chrome entirely — a workout is not a page you happen to be on.
	//
	// This file owns persistence and the routine library. Everything below it is handed plain data and
	// callbacks.
	import { onMount } from 'svelte'
	import {
		clonePlan,
		countSets,
		displayName,
		makeActiveSession,
		makeDay,
		makeGymFile,
		makeRoutine,
		mergeCustomExercises,
		mergeLogs,
		mergeRoutines,
		noteKey,
		normalizeActiveSession,
		normalizeCustomExercises,
		normalizeLogs,
		normalizeNotes,
		normalizeRoutines,
		previousReps,
		readGymFile,
		sessionToLog,
		type ActiveSession,
		type CustomExercise,
		type GymDay,
		type GymRoutine,
		type SessionLog
	} from '$lib/types/gym'
	import { restTimer } from '$lib/stores/gymTimer.svelte'
	import { downloadJson, readJsonFile } from '$lib/utils/fileIO'
	import ActionSheet from '$lib/components/ActionSheet.svelte'
	import DayEditor from '$lib/components/gym/DayEditor.svelte'
	import DaySheet from '$lib/components/gym/DaySheet.svelte'
	import ExerciseLibrarySheet from '$lib/components/gym/ExerciseLibrarySheet.svelte'
	import LogSheet from '$lib/components/gym/LogSheet.svelte'
	import WorkoutDrawer from '$lib/components/gym/WorkoutDrawer.svelte'

	const LS_ROUTINES = 'gym-routines'
	const LS_LOGS = 'gym-logs'
	const LS_SESSION = 'gym-active-session'
	const LS_CUSTOM = 'gym-exercises'
	const LS_NOTES = 'gym-exercise-notes'
	const LS_OPEN = 'gym-open-routines'
	/**
	 * Whether the workout drawer was up. A phone evicts a backgrounded tab within a couple of
	 * minutes — long enough to take a call between sets — and the reload landed on the library with
	 * a Resume banner. Where you were is part of the session, so it is stored with it.
	 */
	const LS_WORKOUT_OPEN = 'gym-workout-open'

	let routines = $state<GymRoutine[]>([])
	let logs = $state<SessionLog[]>([])
	let custom = $state<CustomExercise[]>([])
	let notes = $state<Record<string, string>>({})
	let session = $state<ActiveSession | null>(null)
	let initialized = $state(false)
	let loadError = $state('')

	/** Which routine cards are open. Persisted: a five-routine library re-collapsing on every visit. */
	let expanded = $state<Record<string, boolean>>({})
	let renamingId = $state<string | null>(null)
	let renameText = $state('')

	// Which surface is up. At most one of these is non-null at a time.
	let peekAt = $state<{ routineId: string; dayId: string } | null>(null)
	let editAt = $state<{ routineId: string; dayId: string } | null>(null)
	let workoutOpen = $state(false)

	let dataMenu = $state(false)
	let routineMenu = $state<GymRoutine | null>(null)
	let logOpen = $state(false)
	let libraryOpen = $state(false)
	let libraryPrefill = $state('')
	/** Set by whichever surface asked for a name; the library sheet hands the choice straight back. */
	let pendingPick = $state<((name: string) => void) | null>(null)

	const find = (routineId: string, dayId: string) => {
		const routine = routines.find((r) => r.id === routineId) ?? null
		return { routine, day: routine?.days.find((d) => d.id === dayId) ?? null }
	}
	const peek = $derived(peekAt ? find(peekAt.routineId, peekAt.dayId) : null)
	const edit = $derived(editAt ? find(editAt.routineId, editAt.dayId) : null)
	const run = $derived(session ? find(session.routineId, session.dayId) : null)
	const doneCount = $derived(
		session ? Object.values(session.entries).filter((e) => e.doneAt).length : 0
	)

	// ---- Persistence -------------------------------------------------------
	// The same normalize runs on both load paths (localStorage and file import): imported files are
	// hand-editable, and a string where a number belongs would break the rest timer silently.
	const load = <T,>(key: string, fn: (raw: unknown) => T, fallback: T): T => {
		try {
			const raw = localStorage.getItem(key)
			return raw ? fn(JSON.parse(raw)) : fallback
		} catch {
			return fallback
		}
	}

	onMount(() => {
		routines = load(LS_ROUTINES, normalizeRoutines, [])
		logs = load(LS_LOGS, normalizeLogs, [])
		custom = load(LS_CUSTOM, normalizeCustomExercises, [])
		notes = load(LS_NOTES, normalizeNotes, {})
		session = load(LS_SESSION, normalizeActiveSession, null)
		expanded = load(LS_OPEN, (raw) => (raw && typeof raw === 'object' ? raw : {}), {}) as Record<
			string,
			boolean
		>
		// One routine has nothing to choose between; open it rather than make the first tap a chore.
		if (routines.length === 1) expanded[routines[0].id] = true
		// An open workout is the only thing that outranks the library on arrival.
		if (session) expanded[session.routineId] = true
		// Back into the workout, not onto the page that offers to resume it. Only when the session
		// still has a day to run — a routine deleted underneath it leaves the banner, which by now
		// has a Cancel on it.
		workoutOpen = !!session && load(LS_WORKOUT_OPEN, (raw) => raw === true, false)
		initialized = true

		// A rest running with no bar on screen would be invisible; stop the clock and free the audio.
		return () => restTimer.teardown()
	})

	$effect(() => {
		if (initialized) localStorage.setItem(LS_ROUTINES, JSON.stringify(routines))
	})
	$effect(() => {
		if (initialized) localStorage.setItem(LS_LOGS, JSON.stringify(logs))
	})
	$effect(() => {
		if (initialized) localStorage.setItem(LS_CUSTOM, JSON.stringify(custom))
	})
	$effect(() => {
		if (initialized) localStorage.setItem(LS_NOTES, JSON.stringify(notes))
	})
	$effect(() => {
		if (initialized) localStorage.setItem(LS_OPEN, JSON.stringify(expanded))
	})
	$effect(() => {
		if (!initialized) return
		// Written on every tick so a mid-workout reload keeps the ticks. The drawer flag rides with
		// it: cleared together, so a cancelled workout can't leave a stale "was open" behind for the
		// next session to inherit.
		if (session) {
			localStorage.setItem(LS_SESSION, JSON.stringify(session))
			localStorage.setItem(LS_WORKOUT_OPEN, JSON.stringify(workoutOpen))
		} else {
			localStorage.removeItem(LS_SESSION)
			localStorage.removeItem(LS_WORKOUT_OPEN)
		}
	})

	// ---- Routines ----------------------------------------------------------
	function newRoutine() {
		const r = makeRoutine(`Routine ${routines.length + 1}`)
		routines = [...routines, r]
		expanded[r.id] = true
		renamingId = r.id
		renameText = r.name
	}

	function commitRename() {
		const r = routines.find((x) => x.id === renamingId)
		if (r && renameText.trim()) r.name = renameText.trim()
		renamingId = null
	}

	function deleteRoutine(r: GymRoutine) {
		if (!confirm(`Delete "${r.name}"? Logged sessions are kept.`)) return
		if (session?.routineId === r.id) discardWorkout()
		routines = routines.filter((x) => x.id !== r.id)
	}

	function addDay(r: GymRoutine) {
		const d = makeDay(`Day ${r.days.length + 1}`)
		r.days.push(d)
		expanded[r.id] = true
		editAt = { routineId: r.id, dayId: d.id }
	}

	function deleteDay(routineId: string, dayId: string) {
		const { routine, day } = find(routineId, dayId)
		if (!routine || !day) return
		if (day.exercises.length && !confirm(`Delete "${day.name}" and its ${day.exercises.length} exercises?`))
			return
		routine.days = routine.days.filter((d) => d.id !== dayId)
		if (!routine.days.length) routine.days.push(makeDay())
		editAt = null
		peekAt = null
	}

	// ---- Day -> editor / workout ------------------------------------------
	/** Why Start is unavailable, or '' when it is. A second open workout would fork the same log. */
	const startBlocked = $derived.by(() => {
		if (!session || !peekAt) return ''
		if (session.routineId === peekAt.routineId && session.dayId === peekAt.dayId) return ''
		return `A workout is already open on ${run?.day?.name ?? 'another day'}. Finish or cancel it first.`
	})

	function startWorkout() {
		if (!peek?.routine || !peek.day || startBlocked) return
		// Resuming must not restart: the open session already holds the plan and the ticks.
		if (!session) session = makeActiveSession(peek.routine.id, peek.day.id, peek.day.exercises)
		peekAt = null
		workoutOpen = true
	}

	function finishWorkout(mode: 'values' | 'template') {
		if (!session) return
		const { routine, day } = find(session.routineId, session.dayId)
		if (routine && day) {
			const log = sessionToLog(session, routine, day)
			if (log) logs = [...logs, log]
			if (mode === 'template') day.exercises = clonePlan(session.plan)
		}
		discardWorkout()
	}

	function discardWorkout() {
		session = null
		workoutOpen = false
		restTimer.stop()
	}

	/**
	 * The one place a workout is thrown away on purpose — the drawer's Cancel and the banner's both
	 * route here, so the question is asked once and worded the same either way. It stays askable when
	 * the session has outlived its routine: a deleted routine leaves a banner with nothing to resume,
	 * and without this there is no way to clear it short of editing localStorage.
	 */
	function cancelWorkout() {
		const what = run?.day?.name ?? 'this workout'
		if (
			!confirm(
				`Cancel ${what}? ${doneCount} logged set${doneCount === 1 ? '' : 's'} is discarded.`
			)
		)
			return
		discardWorkout()
	}

	function saveDay(draft: GymDay) {
		if (!editAt) return
		const { routine } = find(editAt.routineId, editAt.dayId)
		const i = routine?.days.findIndex((d) => d.id === editAt!.dayId) ?? -1
		if (routine && i >= 0) routine.days[i] = draft
		editAt = null
	}

	// ---- Exercise picking --------------------------------------------------
	// Any surface can ask for a name without knowing the library exists; the sheet is rendered once,
	// last in the DOM, so it paints over the full-screen drawers that asked for it.
	function requestExercise(apply: (name: string) => void, prefill = '') {
		pendingPick = apply
		libraryPrefill = prefill
		libraryOpen = true
	}

	function closeLibrary() {
		libraryOpen = false
		libraryPrefill = ''
		pendingPick = null
	}

	const globalNoteFor = (name: string) => notes[noteKey(name)] ?? ''
	const prevRepsFor = (setId: string) =>
		session ? previousReps(logs, session.routineId, session.dayId, setId) : null

	// ---- File round trip ---------------------------------------------------
	const fileStamp = () => new Date().toISOString().slice(0, 10)
	const slug = (s: string) =>
		s
			.trim()
			.replace(/[^\w-]+/g, '-')
			.replace(/^-|-$/g, '') || 'gym'

	const exportAll = () =>
		downloadJson(`gym-${fileStamp()}.json`, makeGymFile(routines, logs, custom, notes))
	const exportRoutine = (r: GymRoutine) =>
		downloadJson(`${slug(r.name)}-${fileStamp()}.json`, makeGymFile([r], [], custom, notes))
	const exportLogs = () => downloadJson(`gym-log-${fileStamp()}.json`, makeGymFile([], logs))

	async function handleLoadFile(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		loadError = ''
		try {
			const parsed = readGymFile(await readJsonFile(file))
			routines = mergeRoutines(routines, parsed.routines)
			logs = mergeLogs(logs, parsed.logs)
			custom = mergeCustomExercises(custom, parsed.customExercises)
			notes = { ...notes, ...parsed.exerciseNotes }
			for (const r of parsed.routines) expanded[r.id] = true
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not read that file.'
		}
		input.value = '' // let the same file be picked again after a fix
	}

	const dayPreview = (d: GymDay) =>
		d.exercises.length ? d.exercises.map((e) => displayName(e.name)).join(' · ') : 'Empty day'
</script>

<div class="gym flex flex-col bg-cream text-teal min-h-full">
	<!-- Toolbar. Import sits in the open, not behind the ⋯: with no backend, a file is the only backup
	     this tool has, and burying it is the one shortcut that could lose a year of training. -->
	<div class="sticky top-0 z-10 bg-cream border-b border-teal/20 px-3 py-2 sm:px-4 shrink-0">
		<div class="flex items-center gap-1.5 max-w-2xl w-full mx-auto">
			<h1 class="text-xl font-bold mr-auto">Routines</h1>
			<label class="btn btn-sm btn-ghost cursor-pointer shrink-0">
				Import
				<input type="file" accept=".json" class="hidden" onchange={handleLoadFile} />
			</label>
			<button class="btn btn-sm btn-primary shrink-0" onclick={newRoutine}>+ New</button>
			<button
				class="btn btn-sm btn-ghost shrink-0 text-lg leading-none"
				onclick={() => (dataMenu = true)}
				aria-label="Log, library and export">⋯</button
			>
		</div>
		{#if loadError}
			<div
				class="mt-2 max-w-2xl w-full mx-auto flex items-center justify-between gap-1 bg-error/10 text-error rounded px-2 py-1 text-xs border border-error/30"
				role="alert"
			>
				<span>{loadError}</span>
				<button class="btn btn-xs btn-ghost" onclick={() => (loadError = '')} aria-label="Dismiss error"
					>✕</button
				>
			</div>
		{/if}
	</div>

	<div class="flex flex-col gap-2 p-2 sm:p-3 max-w-2xl w-full mx-auto flex-1">
		<!-- An open workout outranks everything: it is unfinished work with a clock attached. -->
		{#if session && !workoutOpen}
			<div class="rounded-xl border border-primary/50 bg-primary/10 p-3 flex items-center gap-3">
				<div class="min-w-0 flex-1">
					<p class="font-semibold truncate">
						{run?.day?.name ?? 'Workout'} in progress
					</p>
					<p class="text-xs opacity-70 tabular-nums">
						{run?.routine?.name ?? '—'} · {doneCount} set{doneCount === 1 ? '' : 's'} logged
					</p>
				</div>
				<!-- Cancel sits here as well as inside the drawer: a session whose routine has been deleted
				     has no drawer left to open, so this is its only exit. -->
				<button class="btn btn-sm btn-ghost text-error shrink-0" onclick={cancelWorkout}>
					Cancel
				</button>
				<button
					class="btn btn-sm btn-primary shrink-0"
					disabled={!run?.routine || !run.day}
					onclick={() => (workoutOpen = true)}
				>
					Resume
				</button>
			</div>
		{/if}

		{#if !routines.length}
			<div class="flex flex-col items-center justify-center py-24 text-center px-6 flex-1">
				<p class="text-xl mb-1 opacity-70">No routines yet</p>
				<p class="text-sm opacity-50 max-w-xs">
					A routine holds the days you train, and each day holds its lifts. Start one, or import a
					file you exported before.
				</p>
				<button class="btn btn-primary mt-5" onclick={newRoutine}>+ New routine</button>
			</div>
		{/if}

		{#each routines as r (r.id)}
			{@const open = !!expanded[r.id]}
			<section class="rounded-xl border border-teal/20 bg-white/60">
				<div class="flex items-center gap-1 pr-1">
					{#if renamingId === r.id}
						<input
							type="text"
							bind:value={renameText}
							onkeydown={(e) => {
								if (e.key === 'Enter') commitRename()
								if (e.key === 'Escape') renamingId = null
							}}
							class="input input-sm input-bordered bg-white border-teal/30 flex-1 min-w-0 m-2 font-semibold"
							aria-label="Routine name"
						/>
						<button class="btn btn-sm btn-primary shrink-0" onclick={commitRename}>Save</button>
					{:else}
						<!-- One line, not two. The day count was a second line under the name and cost the card
						     28px of height for a number; right-aligned it reads the same and is drawn like
						     every other count in the tool. -->
						<button
							class="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left rounded-l-xl hover:bg-teal/5"
							onclick={() => (expanded[r.id] = !open)}
							aria-expanded={open}
						>
							<span
								class="shrink-0 text-xs opacity-50 transition-transform duration-200 {open
									? 'rotate-90'
									: ''}"
								aria-hidden="true">▶</span
							>
							<span class="flex-1 min-w-0 font-semibold truncate">{r.name}</span>
							<span class="shrink-0 text-xs opacity-60 tabular-nums">
								{r.days.length} day{r.days.length === 1 ? '' : 's'}
							</span>
						</button>
						<button
							class="btn btn-sm btn-ghost shrink-0 text-lg leading-none"
							onclick={() => (routineMenu = r)}
							aria-label="Options for {r.name}">⋯</button
						>
					{/if}
				</div>

				{#if open}
					<div class="border-t border-teal/10">
						{#each r.days as d (d.id)}
							<button
								class="w-full text-left px-3 py-2.5 border-b border-teal/10 last:border-b-0 hover:bg-teal/5 flex items-center gap-3"
								onclick={() => (peekAt = { routineId: r.id, dayId: d.id })}
							>
								<span class="min-w-0 flex-1">
									<span class="flex items-baseline gap-2">
										<span class="font-medium truncate">{d.name}</span>
										{#if session?.dayId === d.id}
											<span class="text-[11px] text-primary font-semibold shrink-0">live</span>
										{/if}
									</span>
									<span class="block text-xs opacity-60 truncate">{dayPreview(d)}</span>
								</span>
								<span class="text-xs opacity-60 tabular-nums shrink-0">{countSets(d)} sets</span>
							</button>
						{/each}
						<div class="p-2">
							<button class="btn btn-sm btn-ghost" onclick={() => addDay(r)}>+ Add day</button>
						</div>
					</div>
				{/if}
			</section>
		{/each}
	</div>

	<!-- Surfaces. Order matters: the library sheet is last so it paints over the full-screen drawers
	     that open it, and both drawers sit inside .gym so the 16px field floor below still reaches
	     them (they are position:fixed, so nesting costs nothing in layout). -->
	{#if peek?.routine && peek.day}
		<DaySheet
			open
			routine={peek.routine}
			day={peek.day}
			hasOpenSession={session?.dayId === peek.day.id}
			blockedReason={startBlocked}
			onEdit={() => {
				editAt = peekAt
				peekAt = null
			}}
			onStart={startWorkout}
			onClose={() => (peekAt = null)}
		/>
	{/if}

	{#if edit?.routine && edit.day}
		<DayEditor
			day={edit.day}
			routineName={edit.routine.name}
			globalNote={globalNoteFor}
			canDelete={session?.dayId !== edit.day.id}
			onPickExercise={requestExercise}
			onDeleteDay={() => editAt && deleteDay(editAt.routineId, editAt.dayId)}
			onSave={saveDay}
			onClose={() => (editAt = null)}
		/>
	{/if}

	{#if session && workoutOpen && run?.routine && run.day}
		<WorkoutDrawer
			bind:session
			routine={run.routine}
			day={run.day}
			globalNote={globalNoteFor}
			prevReps={prevRepsFor}
			onPickExercise={requestExercise}
			onFinish={finishWorkout}
			onCancel={cancelWorkout}
		/>
	{/if}

	{#if routineMenu}
		{@const r = routineMenu}
		<ActionSheet
			open
			title={r.name}
			onClose={() => (routineMenu = null)}
			actions={[
				{
					label: 'Rename',
					onSelect: () => {
						renameText = r.name
						renamingId = r.id
					}
				},
				{ label: 'Add day', onSelect: () => addDay(r) },
				{
					label: 'Export this routine',
					detail: 'A JSON file you can import on another device',
					onSelect: () => exportRoutine(r)
				},
				{
					label: 'Delete routine',
					detail: `${r.days.length} day${r.days.length === 1 ? '' : 's'} · logged sessions are kept`,
					danger: true,
					onSelect: () => deleteRoutine(r)
				}
			]}
		/>
	{/if}

	<ActionSheet
		open={dataMenu}
		title="Gym data"
		onClose={() => (dataMenu = false)}
		actions={[
			{
				label: 'Session log',
				detail: `${logs.length} session${logs.length === 1 ? '' : 's'} recorded`,
				onSelect: () => (logOpen = true)
			},
			{
				label: 'Exercise library',
				detail: 'Add your own lifts and the notes that follow them everywhere',
				onSelect: () => (libraryOpen = true)
			},
			{
				label: 'Export everything',
				detail: 'Routines, log, custom exercises and notes in one file',
				disabled: !routines.length && !logs.length,
				onSelect: exportAll
			}
		]}
	/>

	<LogSheet open={logOpen} {logs} onExport={exportLogs} onClose={() => (logOpen = false)} />

	<ExerciseLibrarySheet
		open={libraryOpen}
		onClose={closeLibrary}
		{custom}
		onCustomChange={(list) => (custom = list)}
		{notes}
		onNotesChange={(next) => (notes = next)}
		onPick={pendingPick
			? (name) => {
					pendingPick?.(name)
					closeLibrary()
				}
			: undefined}
		prefillName={libraryPrefill}
	/>
</div>

<style>
	/*
	 * iOS Safari zooms the page whenever a focused field's computed font-size is under 16px. The
	 * viewport hack that suppresses it (maximum-scale=1) also kills pinch-zoom, so the only honest
	 * fix is the type size — 16px on fields is a floor, not a choice.
	 *
	 * Height is a choice, and it is 32px: the tracker is a dense grid of small numbers, and 44px
	 * boxes made a four-exercise day scroll like a form. Buttons match, and their *labels* go under
	 * 16px since only focused fields trigger the zoom.
	 *
	 * ponytail: 32px is well under Apple's 44px touch minimum, chosen deliberately over it. The one
	 * control that keeps a bigger target is the done box, which is the thing actually tapped between
	 * sets. Raise this pair to 2.25rem if real-device use starts producing misses.
	 */
	.gym :global(input:not([type='checkbox'])),
	.gym :global(select),
	.gym :global(textarea) {
		font-size: 16px;
	}

	.gym :global(input:not([type='checkbox'])),
	.gym :global(select) {
		height: 2rem;
		min-height: 2rem;
	}

	/* The borderless fields — day name in the editor header, the one-line exercise and set notes — are
	   typography rather than boxes, so they lose the fixed height. */
	.gym :global(.input-ghost) {
		height: auto;
		min-height: 2rem;
	}

	.gym :global(.btn),
	.gym :global(summary) {
		min-height: 2rem;
		min-width: 2rem;
	}

	/*
	 * 13px button labels — but only for buttons that didn't ask for a size. This selector outranks
	 * every Tailwind `text-*` utility, so without the `:not` a `text-base` on a primary CTA or a
	 * `text-lg` on a ✕ silently rendered at 13px with nothing in the markup to explain why (measured).
	 * Carrying any `text-` class now opts a button out and lets its own size win.
	 */
	.gym :global(.btn:not([class*='text-'])) {
		font-size: 0.8125rem;
	}

	/* The done box and the header clock stay oversized: one is tapped between sets out of breath, the
	   other is read across a gym floor. Everything else earns its size from the grid. */
	.gym :global(.tap-target),
	.gym :global(.tap-target.btn) {
		min-height: 2.5rem;
		min-width: 2.5rem;
	}

	/*
	 * daisyUI's `button-pop` leaves every .btn resting at scale(0.95) in this build, so a 44px button
	 * actually paints at 41.8px — measured. Dropping the animation is what makes the floor above real
	 * rather than nominal; a 5%-shrunk button is not worth 2px of everyone's tap target.
	 */
	.gym :global(.btn) {
		animation: none;
		transform: none;
	}

	/* Spinner arrows steal ~15px from a 64px box and are unusable with a thumb; the ± buttons beside
	   the reps box and the m/s pairs are the real affordance. */
	.gym :global(input[type='number']) {
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.gym :global(input[type='number']::-webkit-outer-spin-button),
	.gym :global(input[type='number']::-webkit-inner-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
