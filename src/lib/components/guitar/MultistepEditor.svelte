<script lang="ts">
	import { makeStep, type ExerciseStep } from '$lib/types/guitar'

	let {
		steps,
		onChange
	}: {
		steps: ExerciseStep[]
		onChange: (next: ExerciseStep[]) => void
	} = $props()

	// ---- step mutations (immutable, mirror the exercise-level ops in the page) ----
	function addStep() {
		onChange([...steps, makeStep()])
	}
	function updateStep(id: string, patch: Partial<ExerciseStep>) {
		onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))
	}
	function removeStep(id: string) {
		onChange(steps.filter((s) => s.id !== id))
	}
	function moveStep(index: number, dir: -1 | 1) {
		const target = index + dir
		if (target < 0 || target >= steps.length) return
		const next = [...steps]
		;[next[index], next[target]] = [next[target], next[index]]
		onChange(next)
	}

	// ---- drag-to-reorder (same pattern as the exercise cards) ----
	let dragIndex = $state<number | null>(null)
	let dragOverIndex = $state<number | null>(null)

	function reorder(from: number, to: number) {
		if (from === to) return
		if (from < 0 || from >= steps.length || to < 0 || to >= steps.length) return
		const next = [...steps]
		const [moved] = next.splice(from, 1)
		next.splice(to, 0, moved)
		onChange(next)
	}
	function onDragStart(e: DragEvent, i: number) {
		dragIndex = i
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', String(i))
			const row = (e.currentTarget as HTMLElement).closest('[data-step-row]')
			if (row) e.dataTransfer.setDragImage(row, 16, 16)
		}
	}
	function onDragOver(e: DragEvent, i: number) {
		if (dragIndex === null) return
		e.preventDefault()
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
		dragOverIndex = i
	}
	function onDrop(e: DragEvent, i: number) {
		e.preventDefault()
		if (dragIndex !== null) reorder(dragIndex, i)
		dragIndex = null
		dragOverIndex = null
	}
	function onDragEnd() {
		dragIndex = null
		dragOverIndex = null
	}

	// ---- m / s duration boxes (same live-view-of-durationSec pattern as ExerciseCard) ----
	function durParts(sec: number) {
		const whole = Math.max(0, Math.floor(sec))
		return { m: Math.floor(whole / 60), s: whole % 60 }
	}
	const PART_MAX: Record<'m' | 's', number> = { m: 999, s: 59 }
	function selectAllOnFocus(e: FocusEvent) {
		;(e.target as HTMLInputElement).select()
	}
	function commitPart(step: ExerciseStep, part: 'm' | 's', e: Event) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = 0
		v = Math.min(PART_MAX[part], Math.max(0, v))
		el.value = String(v)
		const parts = { ...durParts(step.durationSec), [part]: v }
		updateStep(step.id, { durationSec: parts.m * 60 + parts.s })
	}
	function commitInt(step: ExerciseStep, field: 'repeatCount' | 'restSec', e: Event, min: number) {
		const el = e.target as HTMLInputElement
		let v = parseInt(el.value, 10)
		if (Number.isNaN(v)) v = min
		v = Math.max(min, v)
		el.value = String(v)
		updateStep(step.id, { [field]: v })
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Steps</span>

	{#if steps.length === 0}
		<p class="text-xs opacity-50">No steps yet — add one below.</p>
	{/if}

	{#each steps as step, i (step.id)}
		<div
			data-step-row
			ondragover={(e) => onDragOver(e, i)}
			ondrop={(e) => onDrop(e, i)}
			role="listitem"
			class="rounded border bg-white p-2 flex flex-col gap-1.5 transition-[opacity,box-shadow]
				{dragIndex === i ? 'opacity-40' : ''}
				{dragOverIndex === i && dragIndex !== i
				? 'border-[#02343F] ring-2 ring-[#02343F]'
				: 'border-[#02343F]/20'}"
		>
			<!-- Row header: handle, number, reorder, delete -->
			<div class="flex items-center gap-1.5">
				<span
					draggable="true"
					ondragstart={(e) => onDragStart(e, i)}
					ondragend={onDragEnd}
					class="cursor-grab active:cursor-grabbing select-none shrink-0 leading-none text-[#02343F]/40 hover:text-[#02343F]/70"
					role="button"
					tabindex="-1"
					aria-label="Drag to reorder step"
					title="Drag to reorder">⠿</span
				>
				<span class="text-xs opacity-50 w-5 shrink-0 text-center">{i + 1}</span>
				<span class="flex-1"></span>
				<button
					class="btn btn-xs btn-square btn-ghost shrink-0"
					onclick={() => moveStep(i, -1)}
					disabled={i === 0}
					aria-label="Move step up">▲</button
				>
				<button
					class="btn btn-xs btn-square btn-ghost shrink-0"
					onclick={() => moveStep(i, 1)}
					disabled={i === steps.length - 1}
					aria-label="Move step down">▼</button
				>
				<button
					class="btn btn-xs btn-square btn-ghost btn-error shrink-0"
					onclick={() => removeStep(step.id)}
					aria-label="Remove step">✕</button
				>
			</div>

			<!-- Description -->
			<textarea
				value={step.description}
				oninput={(e) => updateStep(step.id, { description: (e.target as HTMLTextAreaElement).value })}
				placeholder="What to practice this step…"
				rows="2"
				class="textarea textarea-xs textarea-bordered w-full bg-white border-[#02343F]/30 leading-snug"
			></textarea>

			<!-- Timer / repeat / rest -->
			<div class="flex items-end gap-3 flex-wrap">
				<div class="flex items-end gap-1">
					<label class="flex items-end gap-0.5">
						<input
							type="text"
							inputmode="numeric"
							value={durParts(step.durationSec).m}
							onfocus={selectAllOnFocus}
							onchange={(e) => commitPart(step, 'm', e)}
							class="input input-xs input-bordered bg-white border-[#02343F]/30 w-11 text-center"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">m</span>
					</label>
					<label class="flex items-end gap-0.5">
						<input
							type="text"
							inputmode="numeric"
							value={durParts(step.durationSec).s}
							onfocus={selectAllOnFocus}
							onchange={(e) => commitPart(step, 's', e)}
							class="input input-xs input-bordered bg-white border-[#02343F]/30 w-11 text-center"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">s</span>
					</label>
				</div>
				<label class="flex items-end gap-0.5">
					<span class="text-[0.65rem] opacity-50 pb-1.5">×</span>
					<input
						type="text"
						inputmode="numeric"
						value={step.repeatCount}
						onfocus={selectAllOnFocus}
						onchange={(e) => commitInt(step, 'repeatCount', e, 1)}
						class="input input-xs input-bordered bg-white border-[#02343F]/30 w-11 text-center"
						title="Repeat count"
					/>
					<span class="text-[0.65rem] opacity-50 pb-1.5">reps</span>
				</label>
				<!-- Rest applies before the next step, and (opt-in) between this step's repeats. Show the
					 rest field whenever either use is active for this step. -->
				{#if i < steps.length - 1 || (step.repeatCount > 1 && step.restBetweenReps)}
					<label class="flex items-end gap-0.5">
						<input
							type="text"
							inputmode="numeric"
							value={step.restSec}
							onfocus={selectAllOnFocus}
							onchange={(e) => commitInt(step, 'restSec', e, 0)}
							class="input input-xs input-bordered bg-white border-[#02343F]/30 w-11 text-center"
							title="Rest length (seconds)"
						/>
						<span class="text-[0.65rem] opacity-50 pb-1.5">s rest</span>
					</label>
				{/if}
			</div>

			<!-- Opt-in: also rest between repeats of this step (needs >1 rep). -->
			{#if step.repeatCount > 1}
				<label class="flex items-center gap-1.5 cursor-pointer w-fit">
					<input
						type="checkbox"
						class="checkbox checkbox-xs"
						checked={!!step.restBetweenReps}
						onchange={(e) =>
							updateStep(step.id, { restBetweenReps: (e.target as HTMLInputElement).checked })}
					/>
					<span class="text-[0.65rem] uppercase tracking-wide opacity-60">Rest between reps</span>
				</label>
			{/if}
		</div>
	{/each}

	<button class="btn btn-xs btn-outline self-start" onclick={addStep}>+ Add step</button>
</div>
