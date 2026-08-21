import { test, expect } from '@playwright/test'
import { snapRate } from '../src/lib/video/youtubeController'
import {
	BPM_MAX,
	BPM_MIN,
	YT_RATE_RANGE,
	bpmAtMeasure,
	makeExercise,
	makeRoutine,
	moveExerciseToRoutine,
	rateAtPass,
	sectionsTotalSec,
	makeSection,
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

// ---- tempo ramp -------------------------------------------------------------
// Same contract as the speed trainer, in measures: the click must land exactly ON endBpm and hold
// there. Overshooting plays faster than the user asked for; never arriving never trains the target.
test('bpmAtMeasure holds each tier for everyMeasures, then lands on endBpm', () => {
	const r = { endBpm: 120, stepBpm: 5, everyMeasures: 4 }
	expect(bpmAtMeasure(100, r, 0)).toBe(100)
	expect(bpmAtMeasure(100, r, 3)).toBe(100) // same tier
	expect(bpmAtMeasure(100, r, 4)).toBe(105) // bump
	expect(bpmAtMeasure(100, r, 16)).toBe(120) // last tier
	expect(bpmAtMeasure(100, r, 999)).toBe(120) // holds, never overshoots
})

test('bpmAtMeasure clamps a ramp whose span is not a whole multiple of stepBpm', () => {
	const r = { endBpm: 112, stepBpm: 5, everyMeasures: 1 }
	expect(bpmAtMeasure(100, r, 2)).toBe(110)
	expect(bpmAtMeasure(100, r, 3)).toBe(112) // clamped to the target, not 115
})

test('bpmAtMeasure ramps downward from the endpoints alone', () => {
	const r = { endBpm: 80, stepBpm: 10, everyMeasures: 2 }
	expect(bpmAtMeasure(120, r, 0)).toBe(120)
	expect(bpmAtMeasure(120, r, 2)).toBe(110)
	expect(bpmAtMeasure(120, r, 50)).toBe(80)
})

test('bpmAtMeasure stays inside the BPM box limits and survives a junk everyMeasures', () => {
	expect(bpmAtMeasure(390, { endBpm: 900, stepBpm: 20, everyMeasures: 1 }, 99)).toBe(BPM_MAX)
	expect(bpmAtMeasure(30, { endBpm: 1, stepBpm: 20, everyMeasures: 1 }, 99)).toBe(BPM_MIN)
	expect(bpmAtMeasure(100, { endBpm: 200, stepBpm: 5, everyMeasures: 0 }, 3)).toBe(115) // 0 → 1
})

// ---- metronome sections -----------------------------------------------------
test('sectionsTotalSec sums the section clocks', () => {
	const secs = [makeSection(0, 30), makeSection(1, 45), makeSection(2, 30)]
	expect(sectionsTotalSec(secs)).toBe(105)
	expect(secs[1].label).toBe('Section 2')
	expect(sectionsTotalSec([])).toBe(0)
})
