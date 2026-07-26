// Exercise picker options for the Gym routine builder, grouped for <optgroup>. Not exhaustive and
// not meant to be — the builder also accepts a free-typed name and a custom-exercise library, so
// this is just the fast path for the lifts that come up most.

import type { CustomExercise } from '$lib/types/gym'

export type ExerciseGroup = { group: string; names: string[] }

export const EXERCISE_CATALOG: ExerciseGroup[] = [
	{
		group: 'Legs',
		names: [
			'Back Squat',
			'Front Squat',
			'Hack Squat',
			'Leg Press',
			'Romanian Deadlift',
			'Deadlift',
			'Bulgarian Split Squat',
			'Lunge',
			'Leg Extension',
			'Leg Curl',
			'Hip Thrust',
			'Calf Raise'
		]
	},
	{
		group: 'Chest',
		names: [
			'Bench Press',
			'Incline Bench Press',
			'Dumbbell Bench Press',
			'Incline Dumbbell Press',
			'Chest Fly',
			'Cable Crossover',
			'Dip',
			'Push-up'
		]
	},
	{
		group: 'Back',
		names: [
			'Pull-up',
			'Chin-up',
			'Lat Pulldown',
			'Barbell Row',
			'Dumbbell Row',
			'Seated Cable Row',
			'T-Bar Row',
			'Face Pull',
			'Shrug'
		]
	},
	{
		group: 'Shoulders',
		names: [
			'Overhead Press',
			'Dumbbell Shoulder Press',
			'Arnold Press',
			'Lateral Raise',
			'Front Raise',
			'Rear Delt Fly',
			'Upright Row'
		]
	},
	{
		group: 'Arms',
		names: [
			'Barbell Curl',
			'Dumbbell Curl',
			'Hammer Curl',
			'Preacher Curl',
			'Triceps Pushdown',
			'Overhead Triceps Extension',
			'Skull Crusher',
			'Close-Grip Bench Press'
		]
	},
	{
		group: 'Core',
		names: ['Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel', 'Russian Twist', 'Back Extension']
	}
]

export const GROUP_NAMES = EXERCISE_CATALOG.map((g) => g.group)

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Built-ins plus the user's custom exercises, folded into the same groups so the picker and the
 * library dialog show one list. A custom exercise whose name already exists is dropped rather than
 * duplicated; one with an unknown group gets its own group at the end.
 */
export function mergedCatalog(custom: CustomExercise[]): ExerciseGroup[] {
	const groups: ExerciseGroup[] = EXERCISE_CATALOG.map((g) => ({ group: g.group, names: [...g.names] }))
	for (const c of custom) {
		const target = groups.find((g) => same(g.group, c.group))
		if (!target) {
			groups.push({ group: c.group, names: [c.name] })
			continue
		}
		if (!target.names.some((n) => same(n, c.name))) target.names.push(c.name)
	}
	return groups
}

/** Every known exercise name, built-in or custom — for "is this lift already in the library?". */
export function knownNames(custom: CustomExercise[]): string[] {
	return mergedCatalog(custom).flatMap((g) => g.names)
}
