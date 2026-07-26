<script lang="ts">
	// History. Read after the fact, never during a set, so it is a sheet rather than a screen — and it
	// keeps its own Export button, because the log is the half of the backup that the routine export
	// doesn't carry.
	import type { SessionLog } from '$lib/types/gym'
	import GymSheet from './GymSheet.svelte'

	let {
		open = false,
		logs,
		onExport,
		onClose
	}: { open?: boolean; logs: SessionLog[]; onExport: () => void; onClose: () => void } = $props()

	const volume = (l: SessionLog) =>
		l.sets.filter((s) => s.kind !== 'warmup').reduce((n, s) => n + s.reps * s.weight, 0)
	const when = (iso: string) =>
		iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
	const targetLabel = (min: number, max: number | null) =>
		max && max !== min ? `${min}–${max}` : `${min}`
</script>

<GymSheet {open} title="Session log" {onClose}>
	<div class="flex items-center gap-2">
		<h2 class="text-lg font-bold">Session log</h2>
		<span class="text-xs opacity-60">{logs.length} session{logs.length === 1 ? '' : 's'}</span>
		<button class="btn btn-sm btn-outline ml-auto" onclick={onExport} disabled={!logs.length}>
			Export log
		</button>
	</div>

	{#if !logs.length}
		<p class="opacity-50 text-sm py-8 text-center">
			Nothing logged yet. Tick sets as you finish them, then press Finish.
		</p>
	{:else}
		{#each [...logs].reverse() as log (log.id)}
			<div class="rounded-lg border border-teal/20 bg-white/60 p-2 text-sm">
				<div class="flex items-baseline gap-2 flex-wrap">
					<span class="font-semibold">{log.routineName} — {log.dayName}</span>
					<span class="opacity-60 text-xs">{when(log.startedAt)}</span>
					<span class="opacity-60 text-xs ml-auto tabular-nums">
						{log.sets.filter((s) => s.kind !== 'warmup').length} sets · {Math.round(volume(log))} kg
					</span>
				</div>
				<ul class="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2 text-xs opacity-80">
					{#each log.sets as s, i (i)}
						<li>
							{#if s.kind === 'warmup'}<span class="opacity-50">warm-up</span>{/if}
							{s.exerciseName} — <span class:opacity-50={s.assumed}>{s.reps}</span>
							{#if s.assumed}<span class="opacity-50" title="Assumed, not entered">≈</span>{/if}
							× {s.weight} kg
							{#if s.kind !== 'warmup'}
								<span class="opacity-60">
									(target {targetLabel(s.targetRepsMin, s.targetRepsMax)})
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</GymSheet>
