<script lang="ts">
	// What an exercise IS: how its sets are measured, and whether the load helps you or fights you.
	//
	// Its own dialog rather than three more rows in the ⋯ menu. These two settings change what every
	// number on the exercise means — a goal of 40 is forty reps or forty seconds depending on one of
	// them — and a flat action list gave that no more weight than "Move up". A dialog can also show
	// which one is currently set, which a list of switches to throw cannot.
	//
	// The same sheet opens the moment an exercise is added to a day, so the type is a decision made
	// at creation instead of a default discovered later.
	//
	// Writes go back through callbacks rather than mutating `exercise` here: the object belongs to the
	// editor or the session that opened this, and mutating another component's state is exactly the
	// ownership violation Svelte flags. `applyAssisted` lives in types/gym.ts so both callers share it.
	import { MODE_CHOICES, displayName, type ExerciseMode, type GymExercise } from '$lib/types/gym'
	import Sheet from '../Sheet.svelte'

	let {
		exercise,
		onMode,
		onAssisted,
		onClose
	}: {
		exercise: GymExercise
		onMode: (mode: ExerciseMode) => void
		onAssisted: (on: boolean) => void
		onClose: () => void
	} = $props()
</script>

<Sheet open title="{displayName(exercise.name)} — settings" {onClose}>
	<h3 class="text-xs font-semibold uppercase tracking-wide opacity-50">Measured in</h3>

	<div class="flex flex-col gap-1">
		{#each MODE_CHOICES as choice (choice.mode)}
			{@const current = exercise.mode === choice.mode}
			<button
				class="flex items-start gap-2 text-left rounded-lg border px-3 py-2 {current
					? 'border-primary bg-primary/10'
					: 'border-teal/20 bg-white/60 hover:bg-teal/5'}"
				onclick={() => onMode(choice.mode)}
				aria-pressed={current}
			>
				<span class="w-4 shrink-0 text-primary leading-6" aria-hidden="true">{current ? '✓' : ''}</span
				>
				<span class="min-w-0">
					<span class="block font-medium {current ? '' : 'opacity-90'}">{choice.label}</span>
					<span class="block text-xs opacity-60">{choice.detail}</span>
				</span>
			</button>
		{/each}
	</div>

	<!-- The switch deliberately leaves the goal numbers alone — an accidental tap here must not be
	     able to wipe a set of planned goals — which is the whole reason this warning has to be here. -->
	<p class="text-xs opacity-60">
		Switching between reps and seconds leaves the goals as they are, so retype them.
	</p>

	<label class="flex items-start gap-2 rounded-lg border border-teal/20 bg-white/60 px-3 py-2">
		<input
			type="checkbox"
			class="checkbox checkbox-sm mt-0.5 shrink-0"
			checked={exercise.assisted}
			onchange={(e) => onAssisted((e.currentTarget as HTMLInputElement).checked)}
		/>
		<span class="min-w-0">
			<span class="block font-medium">Assisted</span>
			<span class="block text-xs opacity-60">
				A machine takes weight off you, so the load is written as a minus — the closer to 0, the
				stronger. Assistance is left out of the log's volume total.
			</span>
		</span>
	</label>

	{#snippet footer()}
		<div class="p-3">
			<button class="btn btn-primary w-full" onclick={onClose}>Done</button>
		</div>
	{/snippet}
</Sheet>
