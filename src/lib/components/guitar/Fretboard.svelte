<script lang="ts">
	// Dumb SVG fretboard. Caller supplies absolute positions {string 1-6, fret, label, role} and the
	// fret window; this just draws strings, frets, inlays, the nut (when the window starts at fret 1),
	// open/muted markers, and a labelled dot per position. String 1 (high E) on top, 6 (low E) bottom.
	type Marker = { string: number; fret: number; label: string; role: 'root' | 'note' }

	let {
		positions,
		minFret,
		maxFret,
		muted = [],
		highlight = null,
		bare = false,
		zones = null,
		onPick = null
	}: {
		positions: Marker[]
		minFret: number
		maxFret: number
		muted?: number[]
		highlight?: { string: number; fret: number } | null
		bare?: boolean // hide inlay dots + fret numbers (show shapes only)
		zones?: { from: number; to: number; active: boolean }[] | null // position-box outlines
		onPick?: ((fret: number) => void) | null // click a fret column → report its fret number
	} = $props()

	const COL = 38
	const ROW = 26
	const PAD_L = 26
	const PAD_T = 26 // headroom for fret numbers drawn above the 1st string
	const PAD_R = 12
	const PAD_B = 34

	const lo = $derived(Math.max(1, minFret))
	const cols = $derived(maxFret - lo + 1)
	const width = $derived(PAD_L + cols * COL + PAD_R)
	const height = PAD_T + 5 * ROW + PAD_B
	const boardBottom = PAD_T + 5 * ROW

	const stringY = (s: number) => PAD_T + (s - 1) * ROW
	const boundaryX = (b: number) => PAD_L + (b - (lo - 1)) * COL
	const cellX = (f: number) => PAD_L + (f - lo) * COL + COL / 2

	const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21]
	const inlayFrets = $derived(INLAYS.filter((f) => f >= lo && f <= maxFret))
	const openMarks = $derived(positions.filter((p) => p.fret === 0))
	const fretMarks = $derived(positions.filter((p) => p.fret >= lo))
</script>

<svg
	viewBox="0 0 {width} {height}"
	width={width}
	style="max-width:100%;height:auto"
	role="img"
	aria-label="fretboard diagram"
>
	<!-- position-marker inlays, drawn below the 6th string -->
	{#if !bare}
	{#each inlayFrets as f}
		{#if f % 12 === 0}
			<circle cx={cellX(f) - 5} cy={boardBottom + 10} r="3.5" fill="#02343F" opacity="0.5" />
			<circle cx={cellX(f) + 5} cy={boardBottom + 10} r="3.5" fill="#02343F" opacity="0.5" />
		{:else}
			<circle cx={cellX(f)} cy={boardBottom + 10} r="3.5" fill="#02343F" opacity="0.5" />
		{/if}
	{/each}
	{/if}

	<!-- strings -->
	{#each [1, 2, 3, 4, 5, 6] as s}
		<line
			x1={PAD_L}
			y1={stringY(s)}
			x2={boundaryX(maxFret)}
			y2={stringY(s)}
			stroke="#02343F"
			stroke-width="1"
			opacity="0.55"
		/>
	{/each}

	<!-- fret lines -->
	{#each Array(cols + 1) as _, i}
		{@const b = lo - 1 + i}
		<line
			x1={boundaryX(b)}
			y1={stringY(1)}
			x2={boundaryX(b)}
			y2={stringY(6)}
			stroke="#02343F"
			stroke-width={b === 0 ? 4 : 1}
			opacity={b === 0 ? 0.9 : 0.45}
		/>
	{/each}

	<!-- fret numbers, above the 1st string and below the 6th -->
	{#if !bare}
	{#each Array(cols) as _, i}
		{@const f = lo + i}
		<text x={cellX(f)} y={PAD_T - 12} text-anchor="middle" font-size="9" fill="#02343F" opacity="0.6">{f}</text>
		<text x={cellX(f)} y={boardBottom + 26} text-anchor="middle" font-size="9" fill="#02343F" opacity="0.5">{f}</text>
	{/each}
	{/if}

	<!-- position-box outlines (dim; the active position is vivid) -->
	{#if zones}
		{#each zones as z}
			{@const left = z.from <= lo - 1 ? PAD_L - 22 : boundaryX(z.from - 1)}
			{@const right = boundaryX(Math.min(z.to, maxFret))}
			<rect
				x={left}
				y={stringY(1) - 9}
				width={right - left}
				height={5 * ROW + 18}
				rx="4"
				fill={z.active ? '#E07A1F' : 'none'}
				fill-opacity={z.active ? 0.07 : 0}
				stroke={z.active ? '#E07A1F' : '#02343F'}
				stroke-opacity={z.active ? 0.9 : 0.2}
				stroke-width={z.active ? 2 : 1}
				stroke-dasharray={z.active ? '0' : '3 3'}
			/>
		{/each}
	{/if}

	<!-- open / muted markers left of the nut -->
	{#each [1, 2, 3, 4, 5, 6] as s}
		{#if muted.includes(s)}
			<text x={PAD_L - 13} y={stringY(s) + 3} text-anchor="middle" font-size="11" fill="#02343F" opacity="0.5">×</text>
		{/if}
	{/each}
	{#each openMarks as p}
		<circle cx={PAD_L - 13} cy={stringY(p.string)} r="8" fill="white" stroke="#02343F" stroke-width="1.5" />
		<text x={PAD_L - 13} y={stringY(p.string) + 3} text-anchor="middle" font-size="8" fill="#02343F">{p.label}</text>
	{/each}

	<!-- notes -->
	{#each fretMarks as p}
		{@const hi = highlight != null && highlight.string === p.string && highlight.fret === p.fret}
		<circle
			cx={cellX(p.fret)}
			cy={stringY(p.string)}
			r={hi ? 11 : 9.5}
			fill={hi ? '#E07A1F' : p.role === 'root' ? '#02343F' : 'white'}
			stroke={hi ? '#E07A1F' : '#02343F'}
			stroke-width="1.5"
		/>
		<text
			x={cellX(p.fret)}
			y={stringY(p.string) + 3}
			text-anchor="middle"
			font-size="8.5"
			fill={hi || p.role === 'root' ? '#F0EDCC' : '#02343F'}>{p.label}</text
		>
	{/each}

	<!-- transparent click targets per fret column (for position picking) -->
	{#if onPick}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<rect
			x={PAD_L - 24}
			y={stringY(1) - 9}
			width="24"
			height={5 * ROW + 18}
			fill="transparent"
			style="cursor:pointer"
			role="button"
			tabindex="-1"
			aria-label="select open position"
			onclick={() => onPick(0)}
		/>
		{#each Array(cols) as _, i}
			{@const f = lo + i}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<rect
				x={boundaryX(f - 1)}
				y={stringY(1) - 9}
				width={COL}
				height={5 * ROW + 18}
				fill="transparent"
				style="cursor:pointer"
				role="button"
				tabindex="-1"
				aria-label={`select position near fret ${f}`}
				onclick={() => onPick(f)}
			/>
		{/each}
	{/if}
</svg>
