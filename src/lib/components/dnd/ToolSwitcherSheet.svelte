<script lang="ts">
	// The ☰ in each toolkit page's sticky bar. The site drawer already lists these routes, but it
	// lives in the header at the top of the screen — this is the thumb-reachable version, for
	// flipping between spells and class features without losing your place mid-session.
	import { goto } from '$app/navigation'
	import ActionSheet from '$lib/components/ActionSheet.svelte'
	import { resetSlotScroll } from '$lib/utils/scrollGroups'

	let { open = false, current, onClose }: { open?: boolean; current: string; onClose: () => void } =
		$props()

	const TOOLS = [
		{ href: '/toolkit/spell-sets', label: 'Spell Sets', detail: 'Your prepared and known spells' },
		{ href: '/toolkit/class-features', label: 'Class Features', detail: 'Progression, features, tables' }
	]

	const actions = $derived(
		TOOLS.map((t) => ({
			label: t.label,
			detail: t.href === current ? 'Current page' : t.detail,
			disabled: t.href === current,
			onSelect: () => {
				// #slot is in the layout and never remounts, so its scroll position survives navigation.
				resetSlotScroll()
				goto(t.href)
			}
		}))
	)
</script>

<ActionSheet {open} title="Player's Toolkit" {actions} {onClose} />
