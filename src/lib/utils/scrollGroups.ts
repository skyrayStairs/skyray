/**
 * Jump #slot to the previous/next `[data-group-heading]`. No-op past the first/last one.
 *
 * #slot (the layout's 85dvh scroller) is the only scrolling ancestor, and each page's own sticky bar
 * overlays its top — hence barHeight, which parks the heading just below the bar instead of behind
 * it. Shared by the spell and class-feature pages.
 */
export function scrollGroups(dir: 'up' | 'down', barHeight: number): void {
	const slot = document.getElementById('slot')
	if (!slot) return

	const slotTop = slot.getBoundingClientRect().top
	const maxScroll = Math.max(0, slot.scrollHeight - slot.clientHeight)
	const tops = [...slot.querySelectorAll<HTMLElement>('[data-group-heading]')].map((el) =>
		Math.max(
			0,
			Math.min(el.getBoundingClientRect().top - slotTop + slot.scrollTop - barHeight, maxScroll)
		)
	)

	// Epsilon must clear the grid's 8px padding, else the first ▼ jogs instead of jumping.
	const eps = 16
	const target =
		dir === 'down'
			? tops.find((t) => t > slot.scrollTop + eps)
			: [...tops].reverse().find((t) => t < slot.scrollTop - eps)

	if (target === undefined) return
	slot.scrollTo({ top: target, behavior: 'smooth' })
}

/** Send #slot back to the top. Needed on navigation: #slot lives in the layout and never remounts. */
export function resetSlotScroll(): void {
	document.getElementById('slot')?.scrollTo({ top: 0 })
}
