<script lang="ts">
	import { onMount } from 'svelte'
	import type { ClassData, ClassFeature, ClassVersion, CustomSubclass } from '$lib/types/dndClass'
	import { CLASS_SLUGS, CLASS_NAMES, VERSIONS } from '$lib/types/dndClass'
	import { renderInline, splitBlocks } from '$lib/utils/markdown'
	import { scrollGroups } from '$lib/utils/scrollGroups'
	import { downloadJson, readJsonFile } from '$lib/utils/fileIO'
	import { uid } from '$lib/utils/id'
	import { subclassIndex } from '$lib/data/subclassIndex'
	import ActionSheet from '$lib/components/ActionSheet.svelte'
	import ToolSwitcherSheet from '$lib/components/dnd/ToolSwitcherSheet.svelte'
	import SubclassEditor from '$lib/components/dnd/SubclassEditor.svelte'

	const LS_KEY = 'dnd-class-ref'
	const LS_SUBCLASSES = 'dnd-class-subclasses'

	let version = $state<ClassVersion>('2014')
	let slug = $state<string>('barbarian')
	// Level is remembered per class, not globally — you have one character per class, not one level.
	let levels = $state<Record<string, number>>({})
	// Which option you took for each selectable feature, keyed "<version>/<slug>/<feature>" so a
	// 2014 Fighter's Fighting Style and a 2014 Ranger's don't share one answer.
	let picks = $state<Record<string, string>>({})
	// Hand-typed subclasses, and which one is active per class. Kept in a separate key from the rest
	// of the preferences because this is the only content the user authored — losing it isn't the
	// same as losing a remembered level.
	let customSubclasses = $state<CustomSubclass[]>([])
	let activeSubclass = $state<Record<string, string>>({})
	let editing = $state<CustomSubclass | null>(null)
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

	const pickKey = (feature: ClassFeature) => `${version}/${slug}/${feature.name}`

	/** The chosen option, or null for "show them all" — which is the default, so nothing starts hidden. */
	function chosen(feature: ClassFeature) {
		const label = picks[pickKey(feature)]
		return feature.options?.find((o) => o.label === label) ?? null
	}

	function setPick(feature: ClassFeature, label: string) {
		const next = { ...picks }
		// Empty label = "show all", which is the absence of a pick rather than a pick of its own.
		if (label) next[pickKey(feature)] = label
		else delete next[pickKey(feature)]
		picks = next
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
			// Picks are validated lazily instead: an option label from an older SRD refresh simply
			// won't match, and `chosen()` falls back to showing every option rather than nothing.
			if (saved.picks && typeof saved.picks === 'object') {
				for (const [k, v] of Object.entries(saved.picks)) {
					if (typeof v === 'string') picks[k] = v
				}
			}
			if (saved.activeSubclass && typeof saved.activeSubclass === 'object') {
				for (const [k, v] of Object.entries(saved.activeSubclass)) {
					if (typeof v === 'string') activeSubclass[k] = v
				}
			}
		} catch {
			// keep defaults
		}
		try {
			const saved = JSON.parse(localStorage.getItem(LS_SUBCLASSES) ?? '[]')
			if (Array.isArray(saved)) {
				customSubclasses = saved.filter(
					(s) => s?.id && typeof s.name === 'string' && Array.isArray(s.features)
				)
			}
		} catch {
			// a corrupt store shouldn't take the page down with it
		}
		initialized = true
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_KEY, JSON.stringify({ version, slug, levels, picks, activeSubclass }))
	})

	$effect(() => {
		if (!initialized) return
		localStorage.setItem(LS_SUBCLASSES, JSON.stringify(customSubclasses))
	})

	const classActions = $derived(
		CLASS_SLUGS.map((s) => ({
			label: CLASS_NAMES[s],
			detail: s === slug ? 'Current' : undefined,
			disabled: s === slug,
			onSelect: () => (slug = s)
		}))
	)

	const subclassKey = $derived(`${version}/${slug}`)
	const mySubclasses = $derived(customSubclasses.filter((s) => s.version === version && s.slug === slug))
	const activeCustom = $derived(mySubclasses.find((s) => s.name === activeSubclass[subclassKey]) ?? null)

	// Outlines are names and levels only — the scaffold. A name you have already filled in drops out
	// of this list, because your version supersedes it.
	const outlines = $derived(
		(subclassIndex(version)[slug] ?? []).filter(
			(o) => o.name !== data?.subclassName && !mySubclasses.some((s) => s.name === o.name)
		)
	)
	const activeOutline = $derived(
		activeCustom ? null : (outlines.find((o) => o.name === activeSubclass[subclassKey]) ?? null)
	)

	/** Grouped by source book, so it's obvious which shelf a subclass came off. */
	const outlineGroups = $derived.by(() => {
		const by = new Map<string, typeof outlines>()
		for (const o of outlines) by.set(o.source ?? 'Other', [...(by.get(o.source ?? 'Other') ?? []), o])
		return [...by]
	})

	/** Fork an outline into an editable subclass so its descriptions can be filled in. */
	function editActive() {
		if (activeCustom) return (editing = activeCustom)
		if (activeOutline) {
			return (editing = {
				id: uid(),
				version,
				slug,
				name: activeOutline.name,
				features: activeOutline.features.map((f) => ({ ...f, body: '' }))
			})
		}
		editing = { id: uid(), version, slug, name: '', features: [] }
	}

	function selectSubclass(name: string) {
		activeSubclass = { ...activeSubclass, [subclassKey]: name }
	}

	function saveSubclass(s: CustomSubclass) {
		const i = customSubclasses.findIndex((x) => x.id === s.id)
		customSubclasses = i < 0 ? [...customSubclasses, s] : customSubclasses.with(i, s)
		selectSubclass(s.name)
	}

	function deleteSubclass(id: string) {
		const gone = customSubclasses.find((x) => x.id === id)
		customSubclasses = customSubclasses.filter((x) => x.id !== id)
		if (gone && activeSubclass[subclassKey] === gone.name) selectSubclass('')
	}

	async function importSubclasses(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		try {
			const parsed = await readJsonFile(file)
			if (!Array.isArray(parsed)) throw new Error('not a list')
			// Merge by id so re-importing a backup updates rather than duplicates.
			const byId = new Map(customSubclasses.map((s) => [s.id, s]))
			for (const s of parsed as CustomSubclass[]) {
				if (s?.id && s.name && Array.isArray(s.features)) byId.set(s.id, s)
			}
			customSubclasses = [...byId.values()]
		} catch {
			loadError = 'That file is not a subclass export.'
		}
		input.value = ''
	}

	// Features in level order, with the first of each level carrying the group heading. A custom
	// subclass REPLACES the SRD one rather than adding to it — filtering on `subclass !== null`
	// rather than by name, so it holds whatever the user called theirs.
	const ordered = $derived.by(() => {
		if (!data) return []
		const swap = activeCustom ?? activeOutline
		const base = swap ? data.features.filter((f) => f.subclass === null) : data.features
		const extra: ClassFeature[] = activeCustom
			? activeCustom.features.map((f) => ({ ...f, subclass: activeCustom.name }))
			: activeOutline
				? activeOutline.features.map((f) => ({
						...f,
						body: f.body ?? '',
						subclass: activeOutline.name
					}))
				: []
		return [...base, ...extra].sort((a, b) => a.levels[0] - b.levels[0] || a.name.localeCompare(b.name))
	})
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

			<!--
			  Subclass row. Deliberately NOT a [data-group-heading] — the ▲▼ buttons walk those, and
			  this is a control, not a destination. It lives here rather than in the sticky bar because
			  that row already measures 345.7px of 346 at 390px wide.
			-->
			<div class="flex gap-1.5 items-center flex-nowrap">
				<select
					class="select select-xs flex-1 min-w-0 bg-white border-teal/30"
					value={activeSubclass[subclassKey] ?? ''}
					onchange={(e) => selectSubclass(e.currentTarget.value)}
				>
					<option value="">{data.subclassName} (SRD)</option>
					{#if mySubclasses.length}
						<optgroup label="Yours">
							{#each mySubclasses as s (s.id)}
								<option value={s.name}>{s.name}</option>
							{/each}
						</optgroup>
					{/if}
					<!-- Grouped by book. Whether an entry is a bare scaffold or filled in varies per
					     feature now, so that's said on the feature itself rather than on the group. -->
					{#each outlineGroups as [source, subs] (source)}
						<optgroup label={source}>
							{#each subs as o (o.name)}
								<option value={o.name}>{o.name}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
				<button class="btn btn-xs btn-outline shrink-0" onclick={editActive}>
					{activeCustom ? 'Edit' : activeOutline ? 'Fill in' : '+ Subclass'}
				</button>
				<button
					class="btn btn-xs btn-square btn-outline shrink-0"
					onclick={() => downloadJson('my-subclasses.json', customSubclasses)}
					disabled={customSubclasses.length === 0}
					aria-label="Export your subclasses"
					title="Export — these live only in this browser"
				>↓</button>
				<label
					class="btn btn-xs btn-square btn-outline shrink-0 cursor-pointer"
					title="Import a subclass export"
				>
					↑
					<span class="sr-only">Import subclasses</span>
					<input type="file" accept=".json" class="hidden" onchange={importSubclasses} />
				</label>
			</div>

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
					<div class="px-2 pb-2">
						{#if feature.body.trim() === ''}
							<!-- An outline entry: the name and level are the scaffold, the text is yours to add. -->
							<p class="text-xs opacity-50">
								Levels only — tap <strong>Fill in</strong> above to add your own description.
							</p>
						{/if}
						{@render blocks(feature.body)}

						{#if feature.options}
							{@const pick = chosen(feature)}
							<label class="mt-2 flex items-center gap-2">
								<span class="sr-only">Choose your {feature.name}</span>
								<select
									class="select select-xs w-full bg-white border-teal/30"
									value={pick?.label ?? ''}
									onchange={(e) => setPick(feature, e.currentTarget.value)}
								>
									<option value="">Show all {feature.options.length} options</option>
									{#each feature.options as o}
										<option value={o.label}>{o.label}</option>
									{/each}
								</select>
							</label>

							<div class="mt-2 flex flex-col gap-2">
								{#each pick ? [pick] : feature.options as o (o.label)}
									<div class="rounded border border-teal/15 bg-white/60 px-2 py-1.5">
										<p class="text-xs font-bold uppercase tracking-wide opacity-60">{o.label}</p>
										{@render blocks(o.body)}
									</div>
								{/each}
							</div>
						{/if}
					</div>
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

			<!--
			  Required verbatim by the Fan Content Policy, which is what permits naming the other
			  subclasses and their features at all. It also requires this page stay free: no paywall,
			  no subscription, no email gate.
			-->
			<p class="text-xs opacity-50 text-center px-2 pb-6">
				Other subclasses are listed by name and level, with mechanics summarised rather than
				quoted, and each names the book it came from — unofficial Fan Content permitted under the
				<a
					class="underline"
					href="https://company.wizards.com/en/legal/fancontentpolicy"
					target="_blank"
					rel="noreferrer">Fan Content Policy</a
				>. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards
				of the Coast. &copy;Wizards of the Coast LLC.
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

<!-- Keyed so the editor remounts per subclass; its fields initialise from the draft once. -->
{#if editing}
	{#key editing.id}
		<SubclassEditor
			open
			draft={editing}
			onSave={saveSubclass}
			onDelete={customSubclasses.some((s) => s.id === editing?.id)
				? () => deleteSubclass(editing!.id)
				: undefined}
			onClose={() => (editing = null)}
		/>
	{/key}
{/if}

<style>
	/* daisyUI's button-pop leaves every .btn resting at scale(0.95), so nominal heights paint short. */
	.btn {
		animation: none;
		transform: none;
	}

	/* daisyUI fills a disabled button with a translucent dark grey, which on cream reads as a solid
	   block rather than a dimmed control — the level stepper's − at level 1 looked broken. */
	.btn:disabled {
		background-color: transparent;
		border-color: rgba(2, 52, 63, 0.25);
		color: rgba(2, 52, 63, 0.35);
	}
</style>
