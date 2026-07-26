<script lang="ts">
	// Screen 5: the workout. Full-screen and deliberately without a close button — the two ways out
	// are Finish and Cancel, and both are decisions. A stray backdrop tap between sets should not be
	// able to end a session.
	//
	// Everything here edits `session.plan`, the copy taken when the workout started, never the day.
	// That is what lets Finish ask whether today was a one-off or the new plan: if the day had been
	// mutated in place, the question would already have been answered.
	import {
		DEFAULT_REST_WARMUP_SEC,
		displayName,
		makeExercise,
		makeSet,
		plansDiffer,
		restForSet,
		sortSets,
		workingSets,
		type ActiveSession,
		type GymDay,
		type GymExercise,
		type GymRoutine,
		type GymSet
	} from '$lib/types/gym'
	import { restTimer } from '$lib/stores/gymTimer.svelte'
	import { formatMmss } from '$lib/utils/time'
	import ActionSheet from './ActionSheet.svelte'
	import GymSheet from './GymSheet.svelte'
	import RestChip from './RestChip.svelte'

	let {
		session = $bindable(),
		routine,
		day,
		globalNote,
		prevReps,
		onPickExercise,
		onFinish,
		onCancel
	}: {
		/**
		 * Bindable because this component is the only thing that writes to the open session — the ticks,
		 * the weights, exercises added mid-workout. Without the binding Svelte flags every write as a
		 * mutation of state it doesn't own (`ownership_invalid_mutation`), which it is.
		 */
		session: ActiveSession
		routine: GymRoutine
		/** The template this workout started from — only read, and only to spot divergence. */
		day: GymDay
		globalNote: (name: string) => string
		prevReps: (setId: string) => number | null
		onPickExercise: (apply: (name: string) => void, prefill?: string) => void
		onFinish: (mode: 'values' | 'template') => void
		onCancel: () => void
	} = $props()

	let menuFor = $state<GymExercise | null>(null)
	let timerOpen = $state(false)
	let finishOpen = $state(false)

	/** A day-shaped view of the session plan, so `restForSet`'s end-of-day rule still applies today. */
	const runDay = $derived<GymDay>({ id: day.id, name: day.name, exercises: session.plan })
	const doneCount = $derived(Object.values(session.entries).filter((e) => e.doneAt).length)
	const plannedCount = $derived(session.plan.reduce((n, ex) => n + workingSets(ex).length, 0))

	const QUICK_TIMERS = [30, 60, 120, 180]
	const resting = $derived(restTimer.total > 0)
	const readout = $derived(formatMmss(Math.ceil(restTimer.remaining)))

	/**
	 * The header clock is the only rest display now — the sticky bar that used to sit above the action
	 * row was a second copy of a number the corner already owns. Running it doubles as the timer
	 * button, so one place starts, shows and controls every rest.
	 */
	const timerActions = $derived([
		...(resting
			? [
					{
						label: restTimer.running ? 'Pause' : 'Resume',
						onSelect: () => restTimer.toggle()
					},
					{ label: '+30 seconds', onSelect: () => restTimer.nudge(30) },
					{ label: '−15 seconds', onSelect: () => restTimer.nudge(-15) },
					{ label: 'Skip the rest', onSelect: () => restTimer.stop() }
				]
			: []),
		...QUICK_TIMERS.map((sec) => ({
			label: sec < 60 ? `${sec} seconds` : `${sec / 60} minute${sec === 60 ? '' : 's'}`,
			detail: resting ? 'Restarts the clock' : undefined,
			onSelect: () => restTimer.start(sec, 'Timer')
		}))
	])

	/** Warm-ups read as lighter work: tinted band, softer fields, a labelled chip instead of a number. */
	const isWarm = (s: GymSet) => s.kind === 'warmup'
	const fieldTone = (s: GymSet) =>
		isWarm(s) ? 'bg-white/60 border-teal/15' : 'bg-white border-teal/30'

	function labelsFor(ex: GymExercise): string[] {
		let w = 0
		let k = 0
		return ex.sets.map((s) => (s.kind === 'warmup' ? `W${++w}` : `${++k}`))
	}

	const target = (set: GymSet) =>
		set.targetRepsMax && set.targetRepsMax !== set.targetRepsMin
			? `${set.targetRepsMin}–${set.targetRepsMax}`
			: `${set.targetRepsMin}`

	const numberVal = (e: Event) => (e.currentTarget as HTMLInputElement).valueAsNumber

	function toggleDone(exIndex: number, set: GymSet, setIndex: number, label: string) {
		const current = session.entries[set.id]
		if (current?.doneAt) {
			// Un-ticking keeps the number as a draft — you logged it, you just hadn't finished the set.
			session.entries[set.id] = { ...current, doneAt: '' }
			return
		}
		// Nothing typed: fall back to what this set managed last time, then to the planned target, and
		// flag it as assumed. One tap stays enough to log a set, but history has to be able to say
		// "nobody confirmed this number" — otherwise a set you did 5 reps of is recorded as 8 forever.
		const typed = current?.reps
		const reps = typed ?? prevReps(set.id) ?? set.targetRepsMin
		session.entries[set.id] = {
			reps,
			weight: set.weight,
			doneAt: new Date().toISOString(),
			assumed: typed === undefined
		}
		const rest = restForSet(runDay, exIndex, setIndex)
		const ex = session.plan[exIndex]
		if (rest > 0) restTimer.start(rest, `${displayName(ex.name)} · after ${label}`)
		else restTimer.stop() // end of the day — nothing to get ready for
	}

	function setReps(set: GymSet, reps: number | null) {
		if (reps === null) {
			delete session.entries[set.id]
			return
		}
		const current = session.entries[set.id]
		// Typing is a confirmation, so it clears the assumed flag.
		session.entries[set.id] = {
			reps,
			weight: set.weight,
			doneAt: current?.doneAt ?? '',
			assumed: false
		}
	}

	/**
	 * ± on the reps box. With nothing entered the box is showing a ghost — last time's reps, or the
	 * goal — so the first press commits that ghost in either direction rather than stepping off it.
	 */
	function stepReps(set: GymSet, delta: number) {
		const current = session.entries[set.id]?.reps
		const ghost = prevReps(set.id) ?? set.targetRepsMin
		setReps(set, Math.max(0, current === undefined ? ghost : current + delta))
	}

	function addSet(ex: GymExercise, kind: 'warmup' | 'working') {
		const sameKind = ex.sets.filter((s) => s.kind === kind)
		const last = sameKind[sameKind.length - 1]
		ex.sets = sortSets([
			...ex.sets,
			makeSet({
				...(last ?? {}),
				kind,
				restSec: kind === 'warmup' ? DEFAULT_REST_WARMUP_SEC : ex.defaultRestSec
			})
		])
	}

	function removeSet(ex: GymExercise, set: GymSet) {
		if (session.entries[set.id]?.doneAt) return // a logged set is a fact; un-tick it first
		delete session.entries[set.id]
		ex.sets = ex.sets.filter((s) => s.id !== set.id)
	}

	function removeExercise(ex: GymExercise) {
		const logged = ex.sets.filter((s) => session.entries[s.id]?.doneAt).length
		if (
			logged &&
			!confirm(
				`Drop ${displayName(ex.name)}? ${logged} logged set${logged === 1 ? '' : 's'} goes with it.`
			)
		)
			return
		for (const s of ex.sets) delete session.entries[s.id]
		session.plan = session.plan.filter((e) => e.id !== ex.id)
	}

	function addExercise() {
		onPickExercise((name) => (session.plan = [...session.plan, makeExercise(name)]))
	}

	/**
	 * One tap on an ordinary day. The template-vs-values question is only worth an interruption when
	 * the workout actually drifted from the plan — swapping in an exercise, adding a fourth set,
	 * reordering. Heavier weight than planned is not a drift; it is the point.
	 */
	function finish() {
		if (plansDiffer(day.exercises, session.plan)) finishOpen = true
		else onFinish('values')
	}

</script>

<GymSheet open title="Workout — {day.name}" fullScreen dismissable={false} onClose={() => {}}>
	{#snippet header()}
		<div class="flex items-center gap-2 px-2 py-1.5">
			<!-- Reads across a gym floor when it is counting: this is the number you look up for, and it
			     is the only one left now that the bottom bar is gone. -->
			<button
				class="btn btn-ghost tap-target shrink-0 px-2 tabular-nums leading-none text-[1.75rem] {resting
					? 'font-bold'
					: ''} {resting && !restTimer.running ? 'opacity-50' : ''}"
				onclick={() => (timerOpen = true)}
				aria-live="off"
				aria-label={resting ? `Rest timer, ${readout} left — tap for controls` : 'Start a timer'}
				>{resting ? readout : '⏱︎'}</button
			>
			<span class="min-w-0 flex-1 text-center">
				<span class="block text-[11px] uppercase tracking-wide opacity-60 truncate"
					>{routine.name}</span
				>
				<span class="block font-bold leading-tight truncate">{day.name}</span>
			</span>
			<button class="btn btn-sm btn-primary shrink-0" onclick={finish}>Finish</button>
		</div>
		<!-- Progress, not decoration: this is the number you check when you are deciding whether you
		     have another exercise in you. -->
		<div class="px-3 pb-1 flex items-center gap-2">
			<progress
				class="progress progress-primary h-1 flex-1"
				value={plannedCount ? Math.min(doneCount, plannedCount) : 0}
				max={plannedCount || 1}
				aria-label="Sets done"
			></progress>
			<span class="text-xs tabular-nums opacity-70">{doneCount}/{plannedCount}</span>
		</div>
	{/snippet}

	{#each session.plan as ex, exIndex (ex.id)}
		{@const labels = labelsFor(ex)}
		{@const gNote = globalNote(ex.name)}
		<section class="rounded-xl border border-teal/20 bg-white/60">
			<div class="flex items-center gap-1 p-2 pb-0">
				<span class="text-xs opacity-40 tabular-nums w-4 shrink-0">{exIndex + 1}</span>
				<h3 class="flex-1 min-w-0 font-semibold truncate px-1">{displayName(ex.name)}</h3>
				<button
					class="btn btn-sm btn-ghost shrink-0 text-lg leading-none"
					onclick={() => (menuFor = ex)}
					aria-label="Options for {displayName(ex.name)}">⋯</button
				>
			</div>

			<div class="px-3 pl-7">
				<input
					type="text"
					value={ex.note}
					oninput={(e) => (ex.note = (e.currentTarget as HTMLInputElement).value)}
					placeholder="note"
					class="input input-sm input-ghost w-full px-1 bg-transparent border-none text-sm placeholder:opacity-30 focus:outline-none focus:bg-white/70 rounded"
					aria-label="Note for {displayName(ex.name)}"
				/>
				{#if gNote}<p class="text-xs opacity-60 px-1">{gNote}</p>{/if}
			</div>

			<div class="px-2 pb-2 flex flex-col">
				{#each ex.sets as set, setIndex (set.id)}
					{@const entry = session.entries[set.id]}
					{@const isDone = !!entry?.doneAt}
					{@const prev = prevReps(set.id)}
					{@const rest = restForSet(runDay, exIndex, setIndex)}
					<!-- Every row carries a band. The padding was always the same on both kinds; only the
					     warm-up's tint made that padding legible as inset, so a bare working row read
					     flush against the card. Working sets take the same treatment one step lighter —
					     warm-ups stay the heavier tint, so the hierarchy survives the equalisation. -->
					<div
						class="rounded-lg px-1 py-0.5 {isDone
							? 'bg-primary/15'
							: isWarm(set)
								? 'bg-teal/[0.07]'
								: 'bg-teal/[0.04]'}"
					>
						<!-- Sized to hold all four controls on one line at 390px — measured. A set that wraps
						     costs ~145px of height, which is the difference between seeing three sets between
						     reps and seeing one. It still wraps rather than shrinks if a narrower phone turns
						     up: the done box and the steppers keep their 44px whatever else has to give. -->
						<div class="flex items-center gap-1 flex-wrap">
							<!-- 44×44 tap target. The checkbox itself is 20px, so the area comes from the label. -->
							<label
								class="tap-target inline-flex items-center justify-center shrink-0 cursor-pointer"
							>
								<input
									type="checkbox"
									class="checkbox checkbox-sm {isWarm(set) ? 'border-teal/30' : ''}"
									checked={isDone}
									onchange={() => toggleDone(exIndex, set, setIndex, labels[setIndex])}
									aria-label="{isWarm(set) ? 'Warm-up' : 'Set'} {labels[setIndex]} done"
								/>
							</label>

							<!-- Goal is read-only here: what you did and what you were aiming for are different
							     numbers, and mid-set is the worst moment to be able to edit the target. A warm-up
							     has no goal at all — you lift whatever gets you ready, and a number there is one
							     more thing to fail against. -->
							<span class="w-16 shrink-0 leading-tight tabular-nums">
								{#if isWarm(set)}
									<span
										class="inline-block text-[10px] tracking-wide rounded-full border border-teal/25 px-1.5 opacity-60"
										>warm {labels[setIndex].slice(1)}</span
									>
								{:else}
									<span class="block text-sm opacity-70">{labels[setIndex]}</span>
									<span class="block text-[11px] opacity-60 whitespace-nowrap"
										>goal {target(set)}</span
									>
								{/if}
							</span>

							<span class="inline-flex items-baseline gap-1 shrink-0">
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

							<span class="ml-auto inline-flex items-center gap-1 shrink-0">
								<button
									class="btn btn-sm btn-outline px-1"
									onclick={() => stepReps(set, -1)}
									aria-label="One fewer rep, set {labels[setIndex]}">−</button
								>
								<!-- An assumed number — filled in by ticking done with an empty box — is set in italic
								     rather than flagged with a marker beside it. The marker was a real element in
								     a row that has exactly 7px of slack at 390px, so it pushed the stepper onto a
								     second line for precisely the sets you didn't stop to type. -->
								<input
									type="number"
									min="0"
									inputmode="numeric"
									value={entry?.reps ?? ''}
									placeholder={String(prev ?? set.targetRepsMin)}
									title={entry?.assumed ? 'Assumed, not entered' : ''}
									oninput={(e) => {
										// Emptying the box clears the set: it drops the entry, which also un-ticks it.
										const v = numberVal(e)
										setReps(set, Number.isFinite(v) && v >= 0 ? Math.round(v) : null)
									}}
									class="input input-bordered {fieldTone(
										set
									)} w-12 text-center px-1 text-base font-semibold tabular-nums
										{entry?.assumed ? 'italic opacity-60' : ''}"
									aria-label="Reps done, set {labels[setIndex]}{entry?.assumed
										? ' — assumed, not entered'
										: ''}{prev !== null ? ` — ${prev} last time` : ''}"
								/>
								<button
									class="btn btn-sm btn-outline px-1"
									onclick={() => stepReps(set, 1)}
									aria-label="One more rep, set {labels[setIndex]}">+</button
								>
							</span>
						</div>

						{#if set.note}
							<p class="text-xs opacity-60 whitespace-pre-wrap pl-12">{set.note}</p>
						{/if}
					</div>

					<RestChip
						sec={rest}
						editable={rest > 0}
						note={setIndex === ex.sets.length - 1 && set.kind !== 'warmup'
							? rest > 0
								? 'before next exercise'
								: 'day ends here'
							: ''}
						label="Rest after set {labels[setIndex]}"
						onChange={(sec) =>
							setIndex === ex.sets.length - 1 && set.kind !== 'warmup'
								? (ex.restAfterSec = sec)
								: (set.restSec = sec)}
					/>
				{/each}

				<button
					class="btn btn-sm btn-outline mt-1 self-start"
					onclick={() => addSet(ex, 'working')}
				>
					+ Add set
				</button>
			</div>
		</section>
	{/each}

	{#if !session.plan.length}
		<div class="py-16 text-center">
			<p class="text-lg opacity-60">Nothing left in this workout</p>
			<p class="text-sm opacity-50 mt-1">Add an exercise below, or cancel.</p>
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex gap-2 p-2">
			<button class="btn btn-sm btn-outline flex-1" onclick={addExercise}>+ Add exercise</button>
			<!-- The page owns the confirmation: the banner can cancel a workout too, and one wording for
			     both beats two that drift. -->
			<button class="btn btn-sm btn-ghost text-error" onclick={onCancel}>Cancel workout</button>
		</div>
	{/snippet}
</GymSheet>

{#if menuFor}
	{@const ex = menuFor}
	<ActionSheet
		open
		title={displayName(ex.name)}
		onClose={() => (menuFor = null)}
		actions={[
			{ label: 'Add set', onSelect: () => addSet(ex, 'working') },
			{ label: 'Add warm-up set', onSelect: () => addSet(ex, 'warmup') },
			{
				label: 'Remove last set',
				detail: 'Only while it is untouched',
				disabled: !ex.sets.length || !!session.entries[ex.sets[ex.sets.length - 1].id]?.doneAt,
				onSelect: () => removeSet(ex, ex.sets[ex.sets.length - 1])
			},
			{
				label: 'Drop this exercise',
				detail: 'Today only, unless you update the template on Finish',
				danger: true,
				onSelect: () => removeExercise(ex)
			}
		]}
	/>
{/if}

<ActionSheet
	open={timerOpen}
	title={resting ? `Rest — ${readout} left` : 'Timer'}
	onClose={() => (timerOpen = false)}
	actions={timerActions}
/>

<!-- Finish. The choice only appears when the workout actually diverged from the plan; on an ordinary
     day Finish is one tap and no question. -->
<ActionSheet
	open={finishOpen}
	title="Finish {day.name}"
	onClose={() => (finishOpen = false)}
	actions={[
		{
			label: 'Save the numbers only',
			detail: `Logs ${doneCount} set${doneCount === 1 ? '' : 's'}. ${day.name} keeps the plan it had.`,
			onSelect: () => onFinish('values')
		},
		{
			label: 'Save and update the day',
			detail: "Today's exercises and sets become the new plan for this day.",
			onSelect: () => onFinish('template')
		}
	]}
/>
