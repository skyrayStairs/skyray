<script lang="ts">
	// Screen 2: what a day actually is, in one glance, before you commit to lifting it.
	//
	// It is a preview, not a workspace — nothing here edits anything. The two ways out are pinned:
	// Edit at the top right, Start at the bottom where the thumb already is. A nine-lift day scrolls
	// between them and neither moves.
	import { countSets, displayName, workingSets, type GymDay, type GymRoutine } from '$lib/types/gym'
	import { formatMmss } from '$lib/utils/time'
	import Sheet from '../Sheet.svelte'

	let {
		open = false,
		routine,
		day,
		hasOpenSession = false,
		blockedReason = '',
		onEdit,
		onStart,
		onClose
	}: {
		open?: boolean
		routine: GymRoutine
		day: GymDay
		/** A workout already running on this day: Start becomes Resume, and nothing is restarted. */
		hasOpenSession?: boolean
		/** Why Start is unavailable — a workout open elsewhere. Empty when it isn't. */
		blockedReason?: string
		onEdit: () => void
		onStart: () => void
		onClose: () => void
	} = $props()

	const totalSets = $derived(countSets(day))
	/** Planned time floor: every rest in the day. Reps take longer, so this reads as "at least". */
	const restBudget = $derived(
		day.exercises.reduce(
			(n, ex) =>
				n +
				ex.sets.reduce((m, s, i) => m + (i === ex.sets.length - 1 ? ex.restAfterSec : s.restSec), 0),
			0
		)
	)

	const range = (min: number, max: number | null) => (max && max !== min ? `${min}–${max}` : `${min}`)

	/** "3 × 8" when the sets agree, "8 · 8 · 6" when they don't — a drop set must not read as uniform. */
	function setSummary(ex: GymDay['exercises'][number]): string {
		const work = workingSets(ex)
		if (!work.length) return 'no working sets'
		// A timed exercise plans in seconds in the same fields, so the unit is the only thing that moves.
		const unit = ex.mode === 'time' ? 's' : ''
		const targets = work.map((s) => range(s.targetRepsMin, s.targetRepsMax) + unit)
		const uniform = targets.every((t) => t === targets[0])
		return uniform ? `${work.length} × ${targets[0]}` : targets.join(' · ')
	}
</script>

<Sheet {open} title="{routine.name} — {day.name}" {onClose}>
	{#snippet header()}
		<div class="flex justify-center pt-2 pb-1">
			<div class="w-10 h-1 bg-teal/30 rounded-full"></div>
		</div>
		<div class="flex items-start gap-2 px-4 pb-3">
			<div class="min-w-0 flex-1">
				<p class="text-xs uppercase tracking-wide opacity-60 truncate">{routine.name}</p>
				<h2 class="text-2xl font-bold leading-tight truncate">{day.name}</h2>
				<p class="text-xs opacity-70 mt-0.5 tabular-nums">
					{day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'} · {totalSets} set{totalSets ===
					1
						? ''
						: 's'}
					{#if restBudget > 0}· {formatMmss(restBudget)} resting{/if}
				</p>
			</div>
			<!-- Not while a workout is running on this day: the runner works on its own copy, so a
			     "Save and update the day" at Finish would silently overwrite whatever was edited here. -->
			<button
				class="btn btn-sm btn-outline shrink-0"
				onclick={onEdit}
				disabled={hasOpenSession}
				title={hasOpenSession ? 'Finish the workout on this day first' : ''}>Edit</button
			>
		</div>
	{/snippet}

	{#if !day.exercises.length}
		<div class="py-10 text-center">
			<p class="text-lg opacity-60">{day.name} is empty</p>
			<p class="text-sm opacity-50 mt-1">Tap Edit to add the first lift.</p>
		</div>
	{:else}
		<ol class="flex flex-col gap-1">
			{#each day.exercises as ex, i (ex.id)}
				{@const warm = ex.sets.length - workingSets(ex).length}
				<li class="flex items-baseline gap-3 rounded-lg bg-white/50 px-3 py-2.5">
					<span class="text-xs opacity-40 tabular-nums w-4 shrink-0">{i + 1}</span>
					<span class="flex-1 min-w-0">
						<span class="block font-medium truncate">{displayName(ex.name)}</span>
						{#if ex.note}
							<span class="block text-xs opacity-60 truncate">{ex.note}</span>
						{/if}
					</span>
					<span class="text-sm tabular-nums opacity-80 shrink-0 text-right">
						{setSummary(ex)}
						{#if warm > 0}
							<span class="block text-[11px] opacity-60">+{warm} warm-up</span>
						{/if}
					</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#snippet footer()}
		<div class="p-3">
			<button
				class="btn btn-primary w-full text-base"
				onclick={onStart}
				disabled={!day.exercises.length || !!blockedReason}
			>
				{hasOpenSession ? 'Resume workout' : 'Start workout'}
			</button>
			{#if blockedReason}
				<p class="text-xs text-center mt-1.5 opacity-80" role="status">{blockedReason}</p>
			{:else if !day.exercises.length}
				<p class="text-xs opacity-60 text-center mt-1.5">Add an exercise before starting.</p>
			{/if}
		</div>
	{/snippet}
</Sheet>
