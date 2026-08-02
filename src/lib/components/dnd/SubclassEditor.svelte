<script lang="ts">
	// Type in a subclass the SRD doesn't carry. The text stays in this browser's localStorage — see
	// the note on CustomSubclass for why — so the Export button is the only backup that exists.
	import type { CustomSubclass } from '$lib/types/dndClass'
	import { parseLevels } from '$lib/types/dndClass'
	import Sheet from '$lib/components/Sheet.svelte'

	let {
		open = false,
		draft,
		onSave,
		onDelete,
		onClose
	}: {
		open?: boolean
		draft: CustomSubclass
		onSave: (s: CustomSubclass) => void
		onDelete?: () => void
		onClose: () => void
	} = $props()

	// Mounted fresh per open by the parent, so a plain initializer is the whole lifecycle.
	let name = $state(draft.name)
	let features = $state(
		draft.features.length
			? draft.features.map((f) => ({ name: f.name, levels: f.levels.join(', '), body: f.body }))
			: [{ name: '', levels: '3', body: '' }]
	)
	let confirmDelete = $state(false)

	// Explicit handlers rather than bind:value — inside a nested each over object properties,
	// bind: silently fails to persist in Svelte 5, so writes go back through the index.
	function setField(i: number, key: 'name' | 'levels' | 'body', value: string) {
		features[i] = { ...features[i], [key]: value }
	}

	const valid = $derived(
		name.trim() !== '' &&
			features.some((f) => f.name.trim() !== '' && parseLevels(f.levels).length > 0)
	)

	function save() {
		onSave({
			...draft,
			name: name.trim(),
			features: features
				.map((f) => ({ name: f.name.trim(), levels: parseLevels(f.levels), body: f.body.trim() }))
				// A feature with no name or no usable level would break the level grouping downstream.
				.filter((f) => f.name !== '' && f.levels.length > 0)
		})
		onClose()
	}
</script>

<Sheet {open} tall title={draft.name ? `Edit ${draft.name}` : 'Add a subclass'} {onClose}>
	<label class="flex flex-col gap-1">
		<span class="text-xs font-bold uppercase tracking-wide opacity-60">Subclass name</span>
		<input
			class="input input-sm w-full bg-white border-teal/30"
			placeholder="Path of the Totem Warrior"
			value={name}
			oninput={(e) => (name = e.currentTarget.value)}
		/>
	</label>

	{#each features as f, i (i)}
		<div class="rounded border border-teal/20 bg-white/60 p-2 flex flex-col gap-2">
			<div class="flex gap-2">
				<input
					class="input input-sm flex-1 min-w-0 bg-white border-teal/30"
					placeholder="Feature name"
					value={f.name}
					oninput={(e) => setField(i, 'name', e.currentTarget.value)}
				/>
				<input
					class="input input-sm w-24 shrink-0 bg-white border-teal/30"
					placeholder="3, 6, 14"
					aria-label="Levels for {f.name || 'this feature'}"
					value={f.levels}
					oninput={(e) => setField(i, 'levels', e.currentTarget.value)}
				/>
				<button
					class="btn btn-sm btn-ghost text-error shrink-0"
					onclick={() => (features = features.filter((_, j) => j !== i))}
					disabled={features.length === 1}
					aria-label="Remove feature"
				>✕</button>
			</div>
			<textarea
				class="textarea textarea-sm w-full bg-white border-teal/30 leading-snug"
				rows="4"
				placeholder="What the feature does. **bold**, - bullets and | pipe | tables | work."
				value={f.body}
				oninput={(e) => setField(i, 'body', e.currentTarget.value)}
			></textarea>
		</div>
	{/each}

	<button
		class="btn btn-sm btn-outline"
		onclick={() => (features = [...features, { name: '', levels: '', body: '' }])}
	>+ Add feature</button>

	<p class="text-xs opacity-60">
		Levels accept a list — <code>4, 8, 12</code> for a feature that recurs. Features with no name or
		no level between 1 and 20 are dropped on save.
	</p>

	{#snippet footer()}
		<div class="flex gap-2 p-3">
			{#if onDelete}
				{#if confirmDelete}
					<button class="btn btn-sm btn-error" onclick={() => { onDelete?.(); onClose() }}>
						Delete
					</button>
					<button class="btn btn-sm btn-ghost" onclick={() => (confirmDelete = false)}>Cancel</button>
				{:else}
					<button class="btn btn-sm btn-outline btn-error" onclick={() => (confirmDelete = true)}>
						Delete
					</button>
				{/if}
			{/if}
			<button class="btn btn-sm btn-primary ml-auto" onclick={save} disabled={!valid}>Save</button>
		</div>
	{/snippet}
</Sheet>

<style>
	/* daisyUI's button-pop leaves every .btn resting at scale(0.95), so heights paint short. */
	.btn {
		animation: none;
		transform: none;
	}
</style>
