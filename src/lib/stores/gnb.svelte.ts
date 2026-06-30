// Cross-module reactive flag for hiding the global nav bar (#header in +layout.svelte).
// A run-mode exercise view sets `gnbState.hidden = true` to reclaim the screen; the layout
// reads it and collapses the header. Mutate the property (don't reassign the export).
export const gnbState = $state({ hidden: false })
