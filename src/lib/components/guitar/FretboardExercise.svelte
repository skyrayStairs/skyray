<script lang="ts">
	import { onMount } from 'svelte'
	import {
		REVEAL_SEC,
		SCALE_TYPE_LABELS,
		SEVENTH_LABELS,
		type FretboardConfig,
		type ScaleType,
		type SeventhType
	} from '$lib/types/guitar'
	import {
		NATURALS,
		NOTE_NAMES,
		STRING_OPEN_PC,
		freqAt,
		fretsForPc,
		naturalsOnString,
		noteName,
		type StringNum
	} from '$lib/music/notes'
	import { chordShape, placeShape, seventhShape, type Shape } from '$lib/music/shapes'
	import { scaleLayout, type ScalePosition } from '$lib/music/positions'
	import { Metronome, type MetronomeConfig } from '$lib/audio/metronome'
	import { tone } from '$lib/audio/beep'
	import Fretboard from './Fretboard.svelte'

	let {
		config,
		onChange,
		finishing = false,
		onFinished
	}: {
		config: FretboardConfig
		onChange?: (next: FretboardConfig) => void
		// Run-mode quiz: the routine timer ran out and is waiting for the current card to finish (req 7).
		finishing?: boolean
		onFinished?: () => void
	} = $props()

	type Marker = { string: number; fret: number; label: string; role: 'root' | 'note' }

	function seventhLabel(type: SeventhType): string {
		return SEVENTH_LABELS.find((s) => s.key === type)?.label ?? '7'
	}
	function windowOf(markers: Marker[], fullNeck: boolean, muteAbsent: boolean) {
		const fretted = markers.filter((m) => m.fret >= 1).map((m) => m.fret)
		const minFret = fullNeck ? 1 : fretted.length ? Math.max(1, Math.min(...fretted) - 1) : 1
		const maxFret = fullNeck ? 12 : fretted.length ? Math.max(...fretted) + 1 : 5
		const muted = muteAbsent
			? [1, 2, 3, 4, 5, 6].filter((s) => !markers.some((m) => m.string === s))
			: []
		return { minFret, maxFret, muted }
	}
	function setRoot(raw: string) {
		onChange?.({ ...config, rootPc: ((parseInt(raw, 10) % 12) + 12) % 12 })
	}
	// Movable grip → markers, normalized so the lowest fretted note sits at fret 1 (root-agnostic).
	function shapeMarkers(shape: Shape): Marker[] {
		const minOff = Math.min(...shape.offsets.map((o) => o.fret))
		return shape.offsets.map((o) => ({
			string: o.string,
			fret: o.fret - minOff + 1,
			label: o.interval,
			role: o.interval === 'R' ? 'root' : 'note'
		}))
	}
	function absentStrings(markers: Marker[]): number[] {
		return [1, 2, 3, 4, 5, 6].filter((s) => !markers.some((m) => m.string === s))
	}

	// ---- chord: major + minor side by side, 6th-string root ----
	const chordData = $derived.by(() => {
		const rootPc = config.rootPc ?? 7
		const boards = (['major', 'minor'] as const).map((q) => {
			const markers = placeShape(chordShape(q), rootPc).map((p) => ({ ...p, label: p.interval }))
			return { label: `${noteName(rootPc)} ${q}`, markers, ...windowOf(markers, false, true) }
		})
		return { boards }
	})

	// ---- note map (naturals on 6th & 5th, frets 0-12) ----
	const noteMap = $derived.by(() => {
		const markers: Marker[] = []
		for (const s of [6, 5] as StringNum[]) {
			for (const n of naturalsOnString(s)) {
				markers.push({
					string: s,
					fret: n.fret,
					label: n.name,
					role: n.name === 'C' ? 'root' : 'note'
				})
			}
		}
		const title = 'Natural notes — 6th & 5th strings (frets 0–12)'
		return { markers, title, ...windowOf(markers, true, false) }
	})

	// ---- seventh: major/minor + all five 7th types for BOTH 6th- and 5th-string roots.
	// Root-agnostic movable grips: every board is the same fixed 4-fret window, no fret numbers,
	// the root finger stays highlighted so 6th- vs 5th-string root reads at a glance. ----
	const sevenths = $derived.by(() =>
		([6, 5] as const).map((rs) => {
			const triads = (['major', 'minor'] as const).map((q) => ({
				label: q === 'major' ? 'Major' : 'Minor',
				shape: chordShape(q, rs)
			}))
			const sevs = SEVENTH_LABELS.map((t) => ({ label: t.label, shape: seventhShape(t.key, rs) }))
			const boards = [...triads, ...sevs].map(({ label, shape }) => {
				const markers = shapeMarkers(shape)
				return { label, markers, minFret: 1, maxFret: 4, muted: absentStrings(markers) }
			})
			return { rs, boards }
		})
	)

	// ---- scale: four scale types, each a full-neck map with the standard OVERLAPPING position
	// boxes (pentatonic = 5 boxes, 2 notes/string; diatonic = 3-notes-per-string positions).
	// Generation + correctness gate live in $lib/music/positions (positions.spec). Click a board to
	// spotlight the nearest position; playback walks each box low→high then high→low, then the next.
	const MAX_FRET = 17
	const scales = $derived.by(() => {
		const rootPc = config.rootPc ?? 7
		return SCALE_TYPE_LABELS.map(({ key, label }) => {
			const layout = scaleLayout(rootPc, key as ScaleType, MAX_FRET)
			const markers: Marker[] = layout.markers.map((n) => ({
				string: n.string,
				fret: n.fret,
				label: n.interval,
				role: n.role
			}))
			return {
				type: key as ScaleType,
				title: `${noteName(rootPc)} ${label} scale`,
				markers,
				positions: layout.positions,
				playOrder: layout.playOrder,
				minFret: 0,
				maxFret: MAX_FRET
			}
		})
	})

	// which position box is spotlighted per board (set by click, or by playback)
	let selectedByType = $state<Record<string, number>>({})
	const selIdx = (t: string) => selectedByType[t] ?? 0
	function pickPosition(t: string, fret: number, positions: ScalePosition[]) {
		if (positions.length === 0) return
		let best = 0
		let bestDist = Infinity
		positions.forEach((p, i) => {
			const d = Math.abs(p.center - fret)
			if (d < bestDist) {
				bestDist = d
				best = i
			}
		})
		selectedByType = { ...selectedByType, [t]: best }
	}

	let playingType = $state<ScaleType | null>(null)
	let activeIdx = $state(-1)
	let audioCtx: AudioContext | null = null
	let metro: Metronome | null = null
	let step = 0

	const activeScale = $derived(
		playingType ? (scales.find((s) => s.type === playingType) ?? null) : null
	)
	const activeEntry = $derived(
		activeScale && activeIdx >= 0 ? (activeScale.playOrder[activeIdx] ?? null) : null
	)
	const activeHighlight = $derived(
		activeEntry ? { string: activeEntry.string, fret: activeEntry.fret } : null
	)

	function scaleCfg(bpm: number): MetronomeConfig {
		return {
			bpm,
			subdivision: 'quarter',
			beatsPerMeasure: 1,
			accentBeats: [0],
			silent: true, // scale plays note tones only — no metronome click
			onTick: () => {
				const sc = activeScale
				if (!sc || sc.playOrder.length === 0) return
				step = (step + 1) % sc.playOrder.length
				activeIdx = step
				const p = sc.playOrder[step]
				selectedByType = { ...selectedByType, [sc.type]: p.zone } // spotlight the box in play
				if (audioCtx && p) tone(audioCtx, freqAt(p.string as StringNum, p.fret))
			}
		}
	}
	function play(type: ScaleType) {
		const bpm = config.bpm ?? 80
		if (!audioCtx) {
			audioCtx = new AudioContext() // created inside the Play click (user gesture)
			metro = new Metronome(audioCtx, scaleCfg(bpm))
		}
		if (audioCtx.state === 'suspended') audioCtx.resume()
		step = -1
		activeIdx = -1
		playingType = type
		metro!.configure(scaleCfg(bpm))
		metro!.start()
	}
	function stop() {
		playingType = null
		activeIdx = -1
		metro?.stop()
		audioCtx?.suspend()
	}
	function setBpm(raw: string) {
		const n = Math.min(300, Math.max(20, parseInt(raw, 10) || 80))
		onChange?.({ ...config, bpm: n })
		if (playingType && metro) metro.configure(scaleCfg(n))
	}

	// ---- quiz (flashcard) ----
	type QuizItem = {
		prompt: string
		answer: string
		markers: Marker[]
		minFret: number
		maxFret: number
		muted: number[]
	}
	function pick<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)]
	}
	let lastNotePc = -1 // req 6: don't ask the same note twice in a row
	function noteItem(): QuizItem {
		let nt = pick(NATURALS)
		if (NATURALS.length > 1) while (nt.pc === lastNotePc) nt = pick(NATURALS)
		lastNotePc = nt.pc
		// req 5: pick a single root string and state it (parallel to the chord prompts).
		const rs = resolveRs()
		const markers: Marker[] = fretsForPc(rs, nt.pc, 12).map((f) => ({
			string: rs,
			fret: f,
			label: nt.name,
			role: 'root' as const
		}))
		return {
			prompt: `${nt.name} / ${nt.solfege} · ${rs}th-string`,
			answer: `${nt.name} (${nt.solfege})`,
			markers,
			...windowOf(markers, true, false)
		}
	}
	// Resolve the quiz root string from the setting ('both' → random 6/5).
	function resolveRs(): 6 | 5 {
		const q = config.quizRootString ?? 'both'
		return q === 'both' ? (pick([6, 5]) as 6 | 5) : q
	}
	// A chord question: pick a root FRET that keeps the whole grip inside frets 1–12, then derive
	// the pitch class — so the root name stays random but the shape never falls off the board.
	function chordItem(shape: Shape, rs: 6 | 5, typeLabel: string): QuizItem {
		const offs = shape.offsets.map((o) => o.fret)
		const loF = Math.max(1, 1 - Math.min(...offs))
		const hiF = Math.min(12, 12 - Math.max(...offs))
		const rootFret = loF + Math.floor(Math.random() * (hiF - loF + 1))
		const rootPc = (STRING_OPEN_PC[rs] + rootFret) % 12
		const name = `${noteName(rootPc)}${typeLabel}`
		const markers = placeShape(shape, rootPc).map((p) => ({ ...p, label: p.interval }))
		return {
			prompt: `${name} · ${rs}th-string root`,
			answer: name,
			markers,
			minFret: 1,
			maxFret: 12,
			muted: absentStrings(markers)
		}
	}
	function seventhItem(): QuizItem {
		const type = pick(SEVENTH_LABELS).key
		const rs = resolveRs()
		return chordItem(seventhShape(type, rs), rs, seventhLabel(type))
	}
	function triadItem(): QuizItem {
		const q = pick(['major', 'minor'] as const)
		const rs = resolveRs()
		return chordItem(chordShape(q, rs), rs, ` ${q}`)
	}
	function randomItem(): QuizItem {
		const pools: (() => QuizItem)[] = []
		if (config.includeNotes ?? true) pools.push(noteItem)
		if (config.includeSevenths ?? true) pools.push(seventhItem)
		if (config.includeTriads ?? true) pools.push(triadItem)
		if (pools.length === 0) pools.push(noteItem)
		return pick(pools)()
	}

	let phase = $state<'guess' | 'reveal'>('guess')
	let remaining = $state(0)
	let current = $state<QuizItem | null>(null)
	let phaseStart = 0
	let phaseDur = 0
	let rafId: number | null = null

	function startGuess() {
		current = randomItem()
		phase = 'guess'
		phaseDur = Math.max(1, config.guessSec ?? 5)
		phaseStart = performance.now()
		remaining = phaseDur
	}
	function startReveal() {
		phase = 'reveal'
		phaseDur = REVEAL_SEC
		phaseStart = performance.now()
		remaining = phaseDur
	}
	function frame() {
		remaining = Math.max(0, phaseDur - (performance.now() - phaseStart) / 1000)
		if (remaining <= 0) {
			if (phase === 'guess') {
				startReveal()
			} else if (finishing) {
				// req 7: routine timer expired — stop after this card's answer shows, let the page advance.
				rafId = null
				onFinished?.()
				return
			} else {
				startGuess()
			}
		}
		rafId = requestAnimationFrame(frame)
	}

	onMount(() => {
		if (config.view === 'quiz') {
			startGuess()
			rafId = requestAnimationFrame(frame)
		}
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId)
			metro?.stop()
			if (audioCtx) {
				audioCtx.close()
				audioCtx = null
			}
		}
	})
</script>

{#snippet rootPicker()}
	<label class="flex items-center gap-1 text-sm">
		Root
		<select
			value={config.rootPc ?? 7}
			onchange={(e) => setRoot((e.target as HTMLSelectElement).value)}
			class="select select-xs select-bordered bg-white border-[#02343F]/30"
		>
			{#each NOTE_NAMES as name, pc}
				<option value={pc}>{name}</option>
			{/each}
		</select>
	</label>
{/snippet}

{#if config.view === 'quiz'}
	<div class="flex flex-col items-center gap-3 min-h-[18rem] justify-center">
		<div class="text-4xl sm:text-5xl font-bold" style="font-family: KNUTRUTHTTF">
			{current?.prompt}
		</div>
		{#if phase === 'guess'}
			<Fretboard positions={[]} minFret={1} maxFret={12} muted={[]} />
			<div class="text-sm opacity-60">Guess… {Math.ceil(remaining)}s</div>
		{:else if current}
			<div class="text-sm opacity-70">Answer: <strong>{current.answer}</strong></div>
			<Fretboard positions={current.markers} minFret={1} maxFret={12} muted={current.muted} />
			<div class="text-xs opacity-50">Next in {Math.ceil(remaining)}s</div>
		{/if}
	</div>
{:else if config.view === 'chord'}
	<div class="flex flex-col items-center gap-3">
		{@render rootPicker()}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
			{#each chordData.boards as c}
				<div class="flex flex-col items-center gap-1">
					<div class="font-medium">{c.label}</div>
					<Fretboard
						positions={c.markers}
						minFret={c.minFret}
						maxFret={c.maxFret}
						muted={c.muted}
					/>
				</div>
			{/each}
		</div>
		<p class="text-xs opacity-50">● root · ○ chord tones — major & minor, 6th-string root</p>
	</div>
{:else if config.view === 'seventh'}
	<div class="flex flex-col items-center gap-2">
		{#each sevenths as group}
			<div class="flex flex-col items-center gap-0.5 w-full">
				<h3 class="text-sm font-bold" style="font-family: KNUTRUTHTTF">
					Major / minor / 7th shapes — {group.rs}th-string root
				</h3>
				<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-2 gap-y-0.5 w-full">
					{#each group.boards as c}
						<div class="flex flex-col items-center gap-0 leading-tight">
							<div class="font-medium text-xs">{c.label}</div>
							<Fretboard
								positions={c.markers}
								minFret={c.minFret}
								maxFret={c.maxFret}
								muted={c.muted}
								bare={true}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}
		<p class="text-[0.65rem] opacity-50">
			Movable grips (root dot filled) for 6th & 5th-string roots — shapes only, no fret numbers.
		</p>
	</div>
{:else if config.view === 'scale'}
	<div class="flex flex-col items-center gap-4">
		<div class="flex items-center gap-3">
			{@render rootPicker()}
			<label class="flex items-center gap-1 text-sm">
				BPM
				<input
					type="number"
					min="20"
					max="300"
					value={config.bpm ?? 80}
					onchange={(e) => setBpm((e.target as HTMLInputElement).value)}
					class="input input-xs input-bordered bg-white border-[#02343F]/30 w-16 text-center"
				/>
			</label>
		</div>
		{#each scales as sc}
			<div class="flex flex-col items-center gap-1 w-full">
				<h3 class="text-base font-bold" style="font-family: KNUTRUTHTTF">{sc.title}</h3>
				<Fretboard
					positions={sc.markers}
					minFret={sc.minFret}
					maxFret={sc.maxFret}
					highlight={playingType === sc.type ? activeHighlight : null}
					zones={sc.positions[selIdx(sc.type)]
						? [
								{
									from: sc.positions[selIdx(sc.type)].minFret,
									to: sc.positions[selIdx(sc.type)].maxFret,
									active: true
								}
							]
						: null}
					onPick={(f) => pickPosition(sc.type, f, sc.positions)}
				/>
				{#if playingType === sc.type}
					<button class="btn btn-xs btn-primary" onclick={stop}>■ Stop</button>
				{:else}
					<button class="btn btn-xs btn-primary" onclick={() => play(sc.type)}>▶ Play</button>
				{/if}
			</div>
		{/each}
		<p class="text-xs opacity-50">
			Tap the neck to spotlight the nearest position (boxes overlap and share notes). Play runs each
			position up & down, then moves to the next.
		</p>
	</div>
{:else}
	<div class="flex flex-col items-center gap-3">
		<h3 class="text-lg font-bold" style="font-family: KNUTRUTHTTF">{noteMap.title}</h3>
		<Fretboard positions={noteMap.markers} minFret={noteMap.minFret} maxFret={noteMap.maxFret} />
		<p class="text-xs opacity-50">● C · ○ other naturals</p>
	</div>
{/if}
