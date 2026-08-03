<script lang="ts">
	// Screen 4: edit mode. A full-screen drawer over the whole site, because planning a day is its own
	// task and half of it is scrolling.
	//
	// It edits a DRAFT, never the live day. That is what makes ✕ mean cancel and Save mean save — the
	// old single-screen tracker had no such moment, so every keystroke was already committed and there
	// was nothing to cancel. The draft is handed back whole on Save.
	//
	// Fields write through explicit handlers rather than bind:value: bind:value silently fails to write
	// back on a property of an item from a nested {#each}, with no compiler complaint.
	import {
		DEFAULT_HOLD_SEC,
		DEFAULT_REST_WARMUP_SEC,
		clonePlan,
		displayName,
		makeExercise,
		makeSet,
		restForSet,
		sortSets,
		workingSets,
		type GymDay,
		type GymExercise,
		type GymSet
	} from '$lib/types/gym'
	import ActionSheet from '../ActionSheet.svelte'
	import DurationInput from './DurationInput.svelte'
	import Sheet from '../Sheet.svelte'
	import RestChip from './RestChip.svelte'

	let {
		day,
		routineName,
		globalNote,
		canDelete = true,
		onPickExercise,
		onDeleteDay,
		onSave,
		onClose
	}: {
		day: GymDay
		routineName: string
		globalNote: (name: string) => string
		/** False while a workout is open on this day — deleting it out from under a session. */
		canDelete?: boolean
		/** Hands the caller's library sheet a slot to write a chosen name into. */
		onPickExercise: (apply: (name: string) => void, prefill?: string) => void
		onDeleteDay: () => void
		onSave: (draft: GymDay) => void
		onClose: () => void
	} = $props()

	// Mounted fresh by the parent for each open, so a plain initializer is the whole lifecycle.
	let draft = $state<GymDay>({ ...day, exercises: clonePlan(day.exercises) })

	/**
	 * Whether a set's goal is a range. Held per set id rather than derived from `targetRepsMax !== null`
	 * because emptying the max box writes null: a derived mode would switch itself off mid-keystroke
	 * and yank the field out from under the cursor. Save reconciles the two.
	 */
	let rangeMode = $state<Record<string, boolean>>(
		Object.fromEntries(
			draft.exercises.flatMap((ex) => ex.sets.map((s) => [s.id, s.targetRepsMax !== null]))
		)
	)

	let menuFor = $state<GymExercise | null>(null)
	let restFor = $state<GymExercise | null>(null)
	let restDraftSec = $state(0)

	const DEFAULT_RANGE_SPAN = 4
	const dirty = $derived(JSON.stringify(day) !== JSON.stringify(draft))

	const numberVal = (e: Event) => (e.currentTarget as HTMLInputElement).valueAsNumber
	/** Keep the current value when a box is emptied or garbage — never persist NaN into the plan. */
	function intOrKeep(e: Event, current: number): number {
		const v = numberVal(e)
		return Number.isFinite(v) && v >= 0 ? Math.round(v) : current
	}

	/** Warm-ups number W1, W2…; working sets number from 1, so "set 3" is the third *working* set. */
	function labelsFor(ex: GymExercise): string[] {
		let w = 0
		let k = 0
		return ex.sets.map((s) => (s.kind === 'warmup' ? `W${++w}` : `${++k}`))
	}

	/** A timed exercise plans in seconds; the target fields are the same ones — see types/gym.ts. */
	const timed = (ex: GymExercise) => ex.mode === 'time'

	/** Warm-ups read as lighter work: tinted band, softer fields, a labelled chip instead of a number. */
	const isWarm = (s: GymSet) => s.kind === 'warmup'
	const fieldTone = (s: GymSet) =>
		isWarm(s) ? 'bg-white/60 border-teal/15' : 'bg-white border-teal/30'

	function toggleRange(set: GymSet, on: boolean) {
		rangeMode[set.id] = on
		set.targetRepsMax = on ? (set.targetRepsMax ?? set.targetRepsMin + DEFAULT_RANGE_SPAN) : null
	}

	function addSet(ex: GymExercise, kind: 'warmup' | 'working') {
		// Copy the last set of the same kind — a warm-up must not inherit a working set's weight — but
		// the rest always comes from the exercise's own default, which is the number the ⋯ menu tunes.
		const sameKind = ex.sets.filter((s) => s.kind === kind)
		const last = sameKind[sameKind.length - 1]
		// With nothing of this kind to copy, a timed exercise's first set would otherwise open as an
		// 8-second hold — the rep default read as seconds.
		const seed = last ?? (timed(ex) ? { targetRepsMin: DEFAULT_HOLD_SEC } : {})
		const next = makeSet({
			...seed,
			kind,
			restSec: kind === 'warmup' ? DEFAULT_REST_WARMUP_SEC : ex.defaultRestSec
		})
		// The first set of a kind has nothing to copy, so it would otherwise ignore the goal mode.
		const inherit = last ? rangeMode[last.id] : false
		next.targetRepsMax = inherit
			? (next.targetRepsMax ?? next.targetRepsMin + DEFAULT_RANGE_SPAN)
			: null
		rangeMode[next.id] = !!inherit
		ex.sets = sortSets([...ex.sets, next])
	}

	const removeSet = (ex: GymExercise, id: string) => (ex.sets = ex.sets.filter((s) => s.id !== id))

	function move(ex: GymExercise, delta: number) {
		const i = draft.exercises.indexOf(ex)
		const to = i + delta
		if (to < 0 || to >= draft.exercises.length) return
		const list = [...draft.exercises]
		list.splice(to, 0, ...list.splice(i, 1))
		draft.exercises = list
	}

	function addExercise() {
		onPickExercise((name) => {
			const ex = makeExercise(name)
			for (const s of ex.sets) rangeMode[s.id] = false
			draft.exercises = [...draft.exercises, ex]
		})
	}

	/** Applies the exercise's new default rest to every working set, not just future ones. */
	function commitDefaultRest() {
		if (!restFor) return
		restFor.defaultRestSec = restDraftSec
		for (const s of restFor.sets) if (s.kind !== 'warmup') s.restSec = restDraftSec
		restFor = null
	}

	function save() {
		// A set left in range mode with an emptied max box is a half-typed range, not a range to zero.
		for (const ex of draft.exercises) {
			for (const s of ex.sets) {
				if (rangeMode[s.id] && s.targetRepsMax === null) s.targetRepsMax = s.targetRepsMin
				if (s.targetRepsMax !== null) s.targetRepsMax = Math.max(s.targetRepsMin, s.targetRepsMax)
			}
		}
		draft.name = draft.name.trim() || day.name
		onSave(draft)
	}

	function cancel() {
		if (dirty && !confirm('Discard the changes to this day?')) return
		onClose()
	}
</script>

<Sheet open title="Edit {draft.name}" fullScreen dismissable={false} onClose={cancel}>
	{#snippet header()}
		<div class="flex items-center gap-2 px-2 py-1.5">
			<button
				class="btn btn-sm btn-ghost shrink-0 text-lg"
				onclick={cancel}
				aria-label="Cancel editing">✕</button
			>
			<span class="min-w-0 flex-1">
				<span class="block text-[11px] uppercase tracking-wide opacity-60 truncate px-1"
					>{routineName}</span
				>
				<input
					type="text"
					value={draft.name}
					oninput={(e) => (draft.name = (e.currentTarget as HTMLInputElement).value)}
					class="input input-ghost w-full font-bold px-1 bg-transparent border-none focus:outline-none"
					aria-label="Day name"
				/>
			</span>
			<button class="btn btn-sm btn-primary shrink-0" onclick={save}>Save</button>
		</div>
	{/snippet}

	{#if !draft.exercises.length}
		<div class="py-16 text-center">
			<p class="text-lg opacity-60">Nothing planned yet</p>
			<p class="text-sm opacity-50 mt-1">Add the first lift from the button below.</p>
		</div>
	{/if}

	{#each draft.exercises as ex, exIndex (ex.id)}
		{@const labels = labelsFor(ex)}
		{@const gNote = globalNote(ex.name)}
		<section class="rounded-xl border border-teal/20 bg-white/60">
			<div class="flex items-center gap-1 p-2 pb-1">
				<span class="text-xs opacity-40 tabular-nums w-4 shrink-0">{exIndex + 1}</span>
				<button
					class="flex-1 min-w-0 text-left font-semibold truncate min-h-9 px-1 rounded hover:bg-teal/10"
					onclick={() => onPickExercise((name) => (ex.name = name), ex.name)}
				>
					{#if ex.name.trim()}
						{ex.name}
					{:else}
						<span class="opacity-50 font-normal">Choose an exercise…</span>
					{/if}
				</button>
				<button
					class="btn btn-sm btn-ghost shrink-0 text-lg leading-none"
					onclick={() => (menuFor = ex)}
					aria-label="Options for {displayName(ex.name)}">⋯</button
				>
			</div>

			<div class="px-2 pb-1 pl-7">
				<input
					type="text"
					value={ex.note}
					oninput={(e) => (ex.note = (e.currentTarget as HTMLInputElement).value)}
					placeholder="note"
					class="input input-sm input-ghost w-full px-1 bg-transparent border-none text-sm placeholder:opacity-30 focus:outline-none focus:bg-white/70 rounded"
					aria-label="Note for {displayName(ex.name)} in this routine"
				/>
				{#if gNote}
					<p class="text-xs opacity-60 px-1 pb-1">{gNote}</p>
				{/if}
			</div>

			<div class="px-2 pb-2 flex flex-col">
				{#each ex.sets as set, setIndex (set.id)}
					{@const isLast = setIndex === ex.sets.length - 1}
					{@const gap = isLast && set.kind !== 'warmup'}
					{@const rest = restForSet(draft, exIndex, setIndex)}
					<!-- Same band rule as the workout: the inset only reads when something fills it, so a
					     working set gets the lighter tint rather than nothing at all. -->
					<div
						class="flex items-center gap-1.5 flex-wrap px-1 py-0.5 rounded-lg {isWarm(set)
							? 'bg-teal/[0.07]'
							: 'bg-teal/[0.04]'}"
					>
						{#if isWarm(set)}
							<span
								class="shrink-0 text-[10px] tracking-wide rounded-full border border-teal/25 px-1.5 py-0.5 opacity-60"
								>warm {labels[setIndex].slice(1)}</span
							>
						{:else}
							<span class="w-7 shrink-0 text-sm tabular-nums opacity-70">{labels[setIndex]}</span>
						{/if}

						<!-- Warm-ups have no goal: the weight is the whole plan, and the reps are whatever gets
						     the joint ready. `targetRepsMin` stays in the data as the workout's ghost number,
						     it just stops being something to plan against. A timed warm-up is the exception —
						     a clock cannot count "whatever", so its length stays editable. -->
						<!-- The mode switch IS the separator: a `+` after a single goal opens a range, and the
						     `–` between a pair closes it. A third neutral glyph parked between the reps and
						     weight boxes read as an operator joining them. -->
						{#if !isWarm(set) || timed(ex)}
							{@const unit = timed(ex) ? 'seconds' : 'reps'}
							<span class="inline-flex items-center gap-1">
								<input
									type="number"
									min="0"
									inputmode="numeric"
									value={set.targetRepsMin}
									oninput={(e) => (set.targetRepsMin = intOrKeep(e, set.targetRepsMin))}
									class="input input-bordered {fieldTone(set)} w-12 text-center px-1 tabular-nums"
									aria-label="{rangeMode[set.id] ? `Goal ${unit} low` : `Goal ${unit}`}, set {labels[
										setIndex
									]}"
								/>
								<button
									class="btn btn-sm btn-ghost px-1 opacity-50 font-normal"
									onclick={() => toggleRange(set, !rangeMode[set.id])}
									aria-pressed={!!rangeMode[set.id]}
									aria-label={rangeMode[set.id]
										? `Use a single ${unit} goal for set ${labels[setIndex]}`
										: `Use a ${unit} range for set ${labels[setIndex]}`}
									>{rangeMode[set.id] ? '–' : '+'}</button
								>
								{#if rangeMode[set.id]}
									<input
										type="number"
										min="0"
										inputmode="numeric"
										value={set.targetRepsMax ?? ''}
										placeholder="max"
										oninput={(e) => {
											const v = numberVal(e)
											set.targetRepsMax = Number.isFinite(v) && v > 0 ? Math.round(v) : null
										}}
										class="input input-bordered {fieldTone(set)} w-12 text-center px-1 tabular-nums"
										aria-label="Goal {unit} high, set {labels[setIndex]}"
									/>
								{/if}
								<span class="text-xs opacity-50">{timed(ex) ? 's' : 'reps'}</span>
							</span>
						{/if}

						<span class="inline-flex items-baseline gap-1">
							<input
								type="number"
								min="0"
								step="0.5"
								inputmode="decimal"
								value={set.weight}
								oninput={(e) => {
									const v = numberVal(e)
									if (Number.isFinite(v) && v >= 0) set.weight = v
								}}
								class="input input-bordered {fieldTone(set)} w-14 text-center px-1 tabular-nums"
								aria-label="Weight in kg, set {labels[setIndex]}"
							/>
							<span class="text-xs opacity-50">kg</span>
						</span>

						<button
							class="btn btn-sm btn-ghost shrink-0 opacity-50 ml-auto"
							onclick={() => removeSet(ex, set.id)}
							disabled={ex.sets.length <= 1}
							aria-label="Remove set {labels[setIndex]}">✕</button
						>
					</div>

					<!-- The rest line doubles as the set's note field. The rest chip is short and the row is
					     otherwise empty, so the per-set note the old card kept behind a ✎ toggle costs no
					     height here — and without it, notes already in saved routines would render in the
					     workout and be impossible to change or clear.

					     The chip shows what `restForSet` will actually run, not what the field holds: the
					     last working set takes the exercise gap, and the last one of the day takes nothing
					     at all. An editable 3:00 that never fires is worse than an honest 0:00. -->
					<RestChip
						sec={rest}
						editable={rest > 0}
						note={gap ? (rest > 0 ? 'before next exercise' : 'day ends') : ''}
						label="Rest after set {labels[setIndex]}"
						onChange={(sec) => (gap ? (ex.restAfterSec = sec) : (set.restSec = sec))}
					>
						{#snippet trailing()}
							<!-- The set note rides the rest rule. The old card kept it behind a ✎ toggle; here it
							     costs no height, and without it, notes already in saved routines would render in
							     the workout with no way to change or clear them. -->
							<input
								type="text"
								value={set.note}
								oninput={(e) => (set.note = (e.currentTarget as HTMLInputElement).value)}
								placeholder="note"
								class="input input-xs input-ghost w-16 min-w-0 px-1 bg-transparent border-none text-xs placeholder:opacity-25 focus:outline-none focus:bg-white/70 focus:w-40 rounded"
								aria-label="Note for set {labels[setIndex]}"
							/>
						{/snippet}
					</RestChip>
				{/each}

				<button
					class="btn btn-sm btn-outline mt-2 self-start"
					onclick={() => addSet(ex, 'working')}
				>
					+ Add set
				</button>
			</div>
		</section>
	{/each}

	<!-- Destructive and permanent, so it sits past the end of the work rather than in the header where
	     Save is. You reach it by finishing the list, which is the right amount of friction. -->
	<div class="pt-6 pb-2 flex justify-center">
		<button
			class="btn btn-sm btn-ghost text-error"
			onclick={onDeleteDay}
			disabled={!canDelete}
			title={canDelete ? '' : 'A workout is open on this day'}
		>
			Delete this day
		</button>
	</div>

	{#snippet footer()}
		<div class="p-3">
			<button class="btn btn-outline w-full" onclick={addExercise}>+ Add exercise</button>
		</div>
	{/snippet}
</Sheet>

{#if menuFor}
	{@const ex = menuFor}
	<ActionSheet
		open
		title={displayName(ex.name)}
		onClose={() => (menuFor = null)}
		actions={[
			{
				label: 'Add warm-up set',
				detail: `Rests ${DEFAULT_REST_WARMUP_SEC}s and stays out of the set count`,
				onSelect: () => addSet(ex, 'warmup')
			},
			{
				// The flip leaves the numbers alone rather than reseeding them: an accidental tap here
				// must not be able to wipe a set of planned rep goals.
				label: timed(ex) ? 'Measure in reps' : 'Measure in seconds',
				detail: timed(ex)
					? 'The goals go back to being rep counts, unchanged'
					: 'A hold with its own Start button — the goals become seconds, so retype them',
				onSelect: () => (ex.mode = timed(ex) ? 'reps' : 'time')
			},
			{
				label: 'Default rest for this exercise…',
				detail: `Now ${Math.round(ex.defaultRestSec / 60)}m — applies to every working set`,
				onSelect: () => {
					restDraftSec = ex.defaultRestSec
					restFor = ex
				}
			},
			{
				label: 'Move up',
				disabled: draft.exercises.indexOf(ex) === 0,
				onSelect: () => move(ex, -1)
			},
			{
				label: 'Move down',
				disabled: draft.exercises.indexOf(ex) === draft.exercises.length - 1,
				onSelect: () => move(ex, 1)
			},
			{
				label: 'Remove from this day',
				detail: `${workingSets(ex).length} set${workingSets(ex).length === 1 ? '' : 's'} planned`,
				danger: true,
				onSelect: () => (draft.exercises = draft.exercises.filter((e) => e.id !== ex.id))
			}
		]}
	/>
{/if}

{#if restFor}
	<Sheet
		open
		title="Default rest — {displayName(restFor.name)}"
		onClose={() => (restFor = null)}
	>
		<p class="text-sm opacity-70">
			What every working set of this exercise rests for. Setting it now also rewrites the
			{workingSets(restFor).length} set{workingSets(restFor).length === 1 ? '' : 's'} already planned;
			tap a single set's clock afterwards to give it its own.
		</p>
		<div class="flex items-center gap-2">
			<DurationInput
				value={restDraftSec}
				onChange={(sec) => (restDraftSec = sec)}
				label="Default rest"
			/>
			<button class="btn btn-sm btn-primary ml-auto" onclick={commitDefaultRest}>Apply</button>
		</div>
	</Sheet>
{/if}
