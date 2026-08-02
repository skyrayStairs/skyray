<script lang="ts">
	import { onMount } from 'svelte'
	import type { ClassData, ClassVersion } from '$lib/types/dndClass'
	import { CLASS_SLUGS, CLASS_NAMES, VERSIONS } from '$lib/types/dndClass'
	import { renderInline, splitBlocks } from '$lib/utils/markdown'
	import { scrollGroups } from '$lib/utils/scrollGroups'
	import ActionSheet from '$lib/components/ActionSheet.svelte'
	import ToolSwitcherSheet from '$lib/components/dnd/ToolSwitcherSheet.svelte'

	const LS_KEY = 'dnd-class-ref'

	let version = $state<ClassVersion>('2024')
	let slug = $state<string>('barbarian')
	// Level is remembered per class, not globally — you have one character per class, not one level.
	let levels = $state<Record<string, number>>({})
	let initialized = $state(false)

	let data = $state<ClassData | null>(null)
	let loadError = $state('')
	let classSheetOpen = $state(false)
	let toolSheetOpen = $state(false)
	let stickyBarEl: HTMLElement | undefined

	const level = $derived(levels[slug] ?? 1)
	const className = $derived(CLASS_NAMES[slug])

	// One chunk per class per ruleset: opening a Barbarian downloads ~15KB, not the whole 390KB set.
	const CLASS_FILES = import.meta.glob('$lib/assets/data/dnd/classes/*/*.json')

	function setLevel(next: number) {
		levels = { ...levels, [slug]: Math.min(20, Math.max(1, next)) }
	}

	$effect(() => {
		const wantVersion = version
		const wantSlug = slug
		const loader = Object.entries(CLASS_FILES).find(([k]) => k.endsWith(`/${wantVersion}/${wantSlug}.json`))
		if (!loader) {
			loadError = `No data for ${wantSlug} (${wantVersion}).`
			return
		}
		data = null
		loadError = ''
		loader[1]().then(
			(m) => {
				// Tapping two classes in a row on bad wifi can resolve out of order; keep only the
				// answer to the question still being asked.
				if (wantVersion === version && wantSlug === slug) data = (m as { default: ClassData }).default
			},
			() => {
				if (wantVersion === version && wantSlug === slug) loadError = `Could not load ${wantSlug}.`
			}
		)
	})

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
			if (VERSIONS.some((v) => v.key === saved.version)) version = saved.version
			if (CLASS_SLUGS.includes(saved.slug)) slug = saved.slug
			if (saved.levels && typeof saved.levels === 'object') {
				for (const [k, v] of Object.entries(saved.levels)) {
					if (CLASS_SLUGS.includes(k as never) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 20) {
						levels[k] = v as number
					}
				}
			}
		} catch {
			// keep defaults
		}
		initialized = true
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_KEY, JSON.stringify({ version, slug, levels }))
	})

	const classActions = $derived(
		CLASS_SLUGS.map((s) => ({
			label: CLASS_NAMES[s],
			detail: s === slug ? 'Current' : undefined,
			disabled: s === slug,
			onSelect: () => (slug = s)
		}))
	)

	// Features in level order, with the first of each level carrying the group heading.
	const ordered = $derived(
		data ? [...data.features].sort((a, b) => a.levels[0] - b.levels[0] || a.name.localeCompare(b.name)) : []
	)
	const groupHeads = $derived(
		ordered.map((f, i) => (i === 0 || ordered[i - 1].levels[0] !== f.levels[0] ? f.levels[0] : null))
	)

	/** The progression row for your level, minus the Level and Features columns — the at-a-glance bit. */
	const currentRow = $derived.by(() => {
		if (!data) return []
		const row = data.progression.rows[level - 1]
		if (!row) return []
		return data.progression.head
			.map((h, i) => ({ head: h, value: row[i] }))
			.filter((c, i) => i > 0 && !/^(class )?features$/i.test(c.head) && c.value && c.value !== '—' && c.value !== '-')
	})
</script>

<div class="flex flex-col bg-cream text-teal min-h-full">
	<div
		bind:this={stickyBarEl}
		class="sticky top-0 z-10 bg-cream border-b border-teal/20 px-3 py-2 sm:px-4 shrink-0"
	>
		<!-- Ruleset first: a 2024 Barbarian and a 2014 Barbarian are different characters. -->
		<div class="flex gap-1 mb-2">
			{#each VERSIONS as v}
				<button
					class="btn btn-xs sm:btn-sm flex-1 {version === v.key ? 'btn-primary' : 'btn-outline'}"
					onclick={() => (version = v.key)}
				>{v.label}</button>
			{/each}
		</div>

		<div class="flex gap-1.5 items-center flex-nowrap">
			<button
				class="btn btn-xs btn-outline flex-1 min-w-0"
				onclick={() => (classSheetOpen = true)}
			><span class="truncate">{className}</span> ▾</button>

			<div class="flex items-center gap-1 shrink-0">
				<button
					class="btn btn-xs btn-square btn-outline"
					onclick={() => setLevel(level - 1)}
					disabled={level <= 1}
					aria-label="Lower level"
				>−</button>
				<span class="w-9 text-center text-xs tabular-nums" aria-label="Character level">Lv {level}</span>
				<button
					class="btn btn-xs btn-square btn-outline"
					onclick={() => setLevel(level + 1)}
					disabled={level >= 20}
					aria-label="Raise level"
				>+</button>
			</div>

			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollGroups('up', stickyBarEl?.offsetHeight ?? 0)}
				aria-label="Previous group heading"
			>▲</button>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => scrollGroups('down', stickyBarEl?.offsetHeight ?? 0)}
				aria-label="Next group heading"
			>▼</button>
			<button
				class="btn btn-xs btn-square btn-outline shrink-0"
				onclick={() => (toolSheetOpen = true)}
				aria-label="Switch tool"
			>☰</button>
		</div>
	</div>

	<div class="max-w-2xl w-full mx-auto p-2 flex flex-col gap-2">
		{#if loadError}
			<div class="rounded border border-error/30 bg-error/10 px-2 py-1 text-xs text-error" role="alert">
				{loadError}
			</div>
		{:else if !data}
			<p class="py-24 text-center text-sm opacity-40">Loading {className}…</p>
		{:else}
			<!-- What your sheet needs mid-turn: this level's row of the progression table. -->
			{#if currentRow.length}
				<div class="flex flex-wrap gap-1">
					{#each currentRow as cell}
						<span class="rounded-full bg-white border border-teal/20 px-2 py-0.5 text-xs">
							<span class="opacity-60">{cell.head}</span>
							<span class="font-semibold tabular-nums">{cell.value}</span>
						</span>
					{/each}
				</div>
			{/if}

			<details class="rounded border border-teal/20 bg-white/50">
				<summary class="cursor-pointer px-2 py-1.5 text-xs font-semibold">
					{className} progression — all 20 levels
				</summary>
				<div class="overflow-x-auto">
					<table class="table table-xs">
						<thead>
							<tr>{#each data.progression.head as h}<th class="whitespace-nowrap">{h}</th>{/each}</tr>
						</thead>
						<tbody>
							{#each data.progression.rows as row, i}
								<tr class={i + 1 === level ? 'bg-teal/15 font-semibold' : ''}>
									{#each row as cell}<td>{cell}</td>{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>

			{#if data.basics.length}
				<details class="rounded border border-teal/20 bg-white/50">
					<summary class="cursor-pointer px-2 py-1.5 text-xs font-semibold">
						Hit points, proficiencies and starting equipment
					</summary>
					<div class="px-2 pb-2 flex flex-col gap-2">
						{#each data.basics as b}
							<div>
								<p class="text-xs font-bold uppercase tracking-wide opacity-60">{b.title}</p>
								{@render blocks(b.body)}
							</div>
						{/each}
					</div>
				</details>
			{/if}

			<!-- Key on subclass+name: a subclass can repeat a base feature's name (Warlock's Pact Boon). -->
			{#each ordered as feature, i (`${feature.subclass ?? ''}/${feature.name}`)}
				{@const head = groupHeads[i]}
				{#if head !== null}
					<div data-group-heading class="flex items-center gap-2 pt-2">
						<span class="h-px flex-1 bg-teal/30"></span>
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide text-cream
								{head <= level ? 'bg-teal' : 'bg-teal/40'}"
						>Level {head}</span>
						<span class="h-px flex-1 bg-teal/30"></span>
					</div>
				{/if}

				<!-- Native <details>: the collapse costs no JS, and "have I got this yet" is the open state. -->
				<details
					class="rounded border border-teal/20 bg-white/50"
					class:opacity-60={feature.levels[0] > level}
					open={feature.levels[0] <= level}
				>
					<summary class="cursor-pointer px-2 py-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						<span class="font-semibold text-sm">{feature.name}</span>
						{#if feature.subclass}
							<span class="rounded bg-teal/15 px-1.5 py-px text-[0.65rem] uppercase tracking-wide">
								{feature.subclass}
							</span>
						{/if}
						{#if feature.levels.length > 1}
							<span class="text-xs opacity-50 tabular-nums">
								also {feature.levels.slice(1).join(', ')}
							</span>
						{/if}
					</summary>
					<div class="px-2 pb-2">{@render blocks(feature.body)}</div>
				</details>
			{/each}

			<p class="text-xs opacity-50 text-center px-2 pt-4 pb-6">
				Class rules from the
				<a class="underline" href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer">
					System Reference Document
				</a>
				5.2.1 and 5.1 &copy; Wizards of the Coast LLC, licensed under
				<a class="underline" href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">
					CC-BY-4.0
				</a>. Each ruleset's SRD includes one subclass per class; Artificer is in neither.
			</p>
		{/if}
	</div>
</div>

{#snippet blocks(md: string)}
	<div class="flex flex-col gap-2 text-sm leading-snug">
		{#each splitBlocks(md) as block}
			{#if block.type === 'table'}
				<div class="overflow-x-auto">
					<table class="table table-xs">
						<thead><tr>{#each block.head as h}<th class="whitespace-nowrap">{h}</th>{/each}</tr></thead>
						<tbody>
							{#each block.rows as row}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<tr>{#each row as cell}<td>{@html renderInline(cell)}</td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if block.type === 'ul'}
				<ul class="list-disc pl-5 flex flex-col gap-1">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{#each block.items as item}<li>{@html renderInline(item)}</li>{/each}
				</ul>
			{:else}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<p>{@html renderInline(block.md)}</p>
			{/if}
		{/each}
	</div>
{/snippet}

<ActionSheet
	open={classSheetOpen}
	title="Choose a class"
	actions={classActions}
	onClose={() => (classSheetOpen = false)}
/>
<ToolSwitcherSheet
	open={toolSheetOpen}
	current="/toolkit/class-features"
	onClose={() => (toolSheetOpen = false)}
/>

<style>
	/* daisyUI's button-pop leaves every .btn resting at scale(0.95), so nominal heights paint short. */
	.btn {
		animation: none;
		transform: none;
	}
</style>
