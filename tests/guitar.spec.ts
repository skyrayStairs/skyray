import { test, expect } from '@playwright/test'
import { snapRate } from '../src/lib/video/youtubeController'
import {
	YT_RATE_RANGE,
	makeExercise,
	makeRoutine,
	moveExerciseToRoutine,
	rateAtPass,
	speedRampReps
} from '../src/lib/types/guitar'
import type { Routine, SpeedTrainer } from '../src/lib/types/guitar'

// The YouTube embed floors off-grid rates toward 0 (probed 2026-08-02: 1.03 → 1, 1.234 → 1.2,
// 0.99 → 0.95), so snapRate must hand it a value that is on the 0.05 grid or a float-hair above.
// If it ever lands a hair BELOW, the player silently drops a step and the UI lies about the speed.
test('snapRate lands on the 0.05 grid, never below it', () => {
	for (let n = 5; n <= 40; n++) {
		const grid = n / 20 // 0.25 … 2.00
		const snapped = snapRate(grid)
		expect(snapped, `${grid} moved off its own grid point`).toBeCloseTo(grid, 6)
		expect(
			snapped,
			`${grid} snapped BELOW the grid → player floors a step down`
		).toBeGreaterThanOrEqual(grid)
	}
})

test('snapRate rounds to the nearest step and clamps to the embed range', () => {
	expect(snapRate(1.03)).toBeCloseTo(1.05, 6) // nearest, not YouTube's floor
	expect(snapRate(1.02)).toBeCloseTo(1, 6)
	expect(snapRate(0.99)).toBeCloseTo(1, 6)
	expect(snapRate(0.1)).toBeCloseTo(YT_RATE_RANGE.min, 6)
	expect(snapRate(4)).toBeCloseTo(YT_RATE_RANGE.max, 6)
})

// ---- speed trainer ----------------------------------------------------------
// The ramp must land exactly ON endRate and stay there: a loop that overshoots plays faster than
// the user asked for, and one that never arrives never trains the target tempo.
const ramp = (o: Partial<SpeedTrainer> = {}): SpeedTrainer => ({
	startRate: 0.7,
	endRate: 1,
	stepRate: 0.05,
	everyReps: 2,
	...o
})

test('the ramp holds each tier for everyReps passes and stops at endRate', () => {
	const sp = ramp() // 0.70 → 1.00 by 0.05 = 7 tiers × 2 reps
	expect(speedRampReps(sp)).toBe(14)
	expect(rateAtPass(sp, 0)).toBeCloseTo(0.7, 6)
	expect(rateAtPass(sp, 1)).toBeCloseTo(0.7, 6) // same tier
	expect(rateAtPass(sp, 2)).toBeCloseTo(0.75, 6) // bump
	expect(rateAtPass(sp, 12)).toBeCloseTo(1, 6) // last tier
	expect(rateAtPass(sp, 99)).toBeCloseTo(1, 6) // holds, never overshoots
})

test('a span that is not a whole number of steps still ends exactly at endRate', () => {
	const sp = ramp({ endRate: 1.02, everyReps: 1 }) // 0.32 span / 0.05 → 6 full steps + a stub
	expect(speedRampReps(sp)).toBe(8)
	expect(rateAtPass(sp, 6)).toBeCloseTo(1, 6)
	expect(rateAtPass(sp, 7)).toBeCloseTo(1.02, 6) // clamped to the target, not 1.05
})

test('a descending ramp slows down and stops at its lower endRate', () => {
	const sp = ramp({ startRate: 1, endRate: 0.8, everyReps: 1 })
	expect(speedRampReps(sp)).toBe(5)
	expect(rateAtPass(sp, 1)).toBeCloseTo(0.95, 6)
	expect(rateAtPass(sp, 9)).toBeCloseTo(0.8, 6)
})

test('every tier of a grid-aligned ramp survives the YouTube rate snap', () => {
	const sp = ramp({ startRate: YT_RATE_RANGE.min, endRate: YT_RATE_RANGE.max, everyReps: 1 })
	for (let p = 0; p < speedRampReps(sp); p++) {
		const r = rateAtPass(sp, p)
		expect(snapRate(r), `tier ${p} (${r}) moved when handed to the player`).toBeCloseTo(r, 6)
	}
})

// ---- moving an exercise between routines ------------------------------------
// Every case here is one where a sloppy implementation loses the exercise entirely.

function twoRoutines(): Routine[] {
	const a = { ...makeRoutine(0), exercises: [makeExercise(0), makeExercise(1)] }
	const b = makeRoutine(1)
	return [a, b]
}

test('moving to an existing routine removes it from one list and appends to the other', () => {
	const [a, b] = twoRoutines()
	const moved = a.exercises[0]
	const next = moveExerciseToRoutine([a, b], a.id, moved.id, b.id)
	expect(next.find((r) => r.id === a.id)?.exercises.map((e) => e.id)).toEqual([a.exercises[1].id])
	expect(next.find((r) => r.id === b.id)?.exercises).toEqual([moved])
})

test('moving to a new routine creates exactly one and lands the exercise in it', () => {
	const [a, b] = twoRoutines()
	const moved = a.exercises[1]
	const next = moveExerciseToRoutine([a, b], a.id, moved.id, null)
	expect(next).toHaveLength(3)
	expect(next[2].exercises).toEqual([moved]) // the created routine holds it — not dropped on the floor
	expect(next.find((r) => r.id === a.id)?.exercises.map((e) => e.id)).toEqual([a.exercises[0].id])
})

test('a no-op move leaves the exercise where it is', () => {
	const [a, b] = twoRoutines()
	expect(moveExerciseToRoutine([a, b], a.id, a.exercises[0].id, a.id)).toEqual([a, b]) // same routine
	expect(moveExerciseToRoutine([a, b], a.id, 'gone', b.id)).toEqual([a, b]) // unknown exercise
})
