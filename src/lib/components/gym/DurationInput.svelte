<script lang="ts">
	// Paired minutes + seconds boxes, so a rest time never needs a colon typed into it.
	import { fromMinSec, toMinSec } from '$lib/types/gym'

	let {
		value,
		onChange,
		disabled = false,
		label = 'Rest',
		width = 'w-14'
	}: {
		value: number
		onChange: (sec: number) => void
		disabled?: boolean
		label?: string
		width?: string
	} = $props()

	const parts = $derived(toMinSec(value))

	// A value prop + change callback rather than $bindable: bind:value silently fails to write back
	// when the parent is binding a property of an item from a nested {#each} over a $derived.
	// onchange (not oninput) so clearing a box mid-edit doesn't immediately rewrite it to 0.
	const commit = (min: number, sec: number) => onChange(fromMinSec(min, sec))
	const val = (e: Event) => (e.currentTarget as HTMLInputElement).valueAsNumber
</script>

<span class="inline-flex items-center gap-1" class:opacity-40={disabled}>
	<input
		type="number"
		min="0"
		inputmode="numeric"
		{disabled}
		value={parts.min}
		onchange={(e) => commit(val(e), parts.sec)}
		class="input input-bordered bg-white border-teal/30 {width} text-center px-1 tabular-nums"
		aria-label="{label} minutes"
	/>
	<span class="text-xs opacity-60">m</span>
	<input
		type="number"
		min="0"
		inputmode="numeric"
		{disabled}
		value={parts.sec}
		onchange={(e) => commit(parts.min, val(e))}
		class="input input-bordered bg-white border-teal/30 {width} text-center px-1 tabular-nums"
		aria-label="{label} seconds"
	/>
	<span class="text-xs opacity-60">s</span>
</span>
