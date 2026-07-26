<script lang="ts">
	// The rest that follows a set, drawn as the gap it is: a rule across the column, broken in the
	// middle by the time. Reading a plan is mostly reading its rhythm — 3 × 8 at 90s is a different
	// session from 3 × 8 at 3 minutes — so the rest gets its own line rather than a fourth number
	// crammed into the set row, and it separates the sets instead of hanging off one of them.
	import { formatMmss } from '$lib/utils/time'
	import DurationInput from './DurationInput.svelte'
	import type { Snippet } from 'svelte'

	let {
		sec,
		note = '',
		editable = true,
		onChange,
		label = 'Rest',
		trailing
	}: {
		sec: number
		/** Why this rest is what it is, when it isn't simply the set's own — e.g. the exercise gap. */
		note?: string
		editable?: boolean
		onChange?: (sec: number) => void
		label?: string
		/** Rides past the far end of the rule — the editor puts the set note here. Kept outside the two
		 * hairlines so the time stays the one thing centred in the gap between sets. */
		trailing?: Snippet
	} = $props()

	let editing = $state(false)
</script>

<div class="flex items-center gap-2 py-0.5">
	<span class="h-px flex-1 bg-teal/15" aria-hidden="true"></span>

	{#if editing}
		<DurationInput value={sec} onChange={(v) => onChange?.(v)} {label} width="w-14" />
		<button class="btn btn-xs btn-ghost" onclick={() => (editing = false)}>Done</button>
	{:else}
		<!-- 32px is the project's control height. This is a bare button, not a `.btn`, so the scoped
		     `.gym .btn` floor never reaches it and `min-h-8` is the only thing holding it up. -->
		<button
			class="text-xs tabular-nums opacity-50 px-1 min-h-8
				{editable ? 'hover:opacity-90' : 'cursor-default'}"
			disabled={!editable}
			onclick={() => (editing = true)}
			aria-label="{label} — {formatMmss(sec)}{editable ? ', tap to change' : ''}"
		>
			{formatMmss(sec)}{#if note}<span class="ml-1.5">{note}</span>{/if}
		</button>
	{/if}

	<span class="h-px flex-1 bg-teal/15" aria-hidden="true"></span>
	{#if trailing}{@render trailing()}{/if}
</div>
