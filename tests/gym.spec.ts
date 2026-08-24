import { test, expect } from '@playwright/test'
import {
	countSets,
	fromMinSec,
	makeActiveSession,
	makeExercise,
	makeGymFile,
	makeRoutine,
	applyAssisted,
	makeSet,
	measuresSeconds,
	mergeRoutines,
	normalizeActiveSession,
	normalizeLog,
	plansDiffer,
	previousReps,
	readGymFile,
	restForSet,
	sessionToLog,
	settingsSummary,
	sortSets,
	toMinSec,
	type GymDay,
	type GymSet,
	type SessionLog
} from '../src/lib/types/gym'

// ---- helpers ----------------------------------------------------------------

function ex(name: string, sets: GymSet[], restAfterSec = 120) {
	return { ...makeExercise(name, 0), sets, restAfterSec }
}

function day(...exercises: ReturnType<typeof ex>[]): GymDay {
	return { id: 'd1', name: 'Push', exercises }
}

/** Rest after every set of the day, flattened, so the whole sequence reads at a glance. */
function restSequence(d: GymDay): number[] {
	return d.exercises.flatMap((e, ei) => e.sets.map((_, si) => restForSet(d, ei, si)))
}

// ---- rest rules -------------------------------------------------------------

test('own rest between sets, exercise gap after the last set, zero at the end of the day', () => {
	const d = day(
		ex('Bench Press', [makeSet({ restSec: 60 }), makeSet({ restSec: 60 })], 120),
		ex('Overhead Press', [makeSet({ restSec: 45 }), makeSet({ restSec: 45 })], 120)
	)
	// 60 between Bench's sets, 120 crossing to OHP, 45 between OHP's sets, then nothing: day over.
	expect(restSequence(d)).toEqual([60, 120, 45, 0])
})

test('a single-exercise day never starts a trailing rest', () => {
	const d = day(ex('Squat', [makeSet({ restSec: 90 }), makeSet({ restSec: 90 })], 180))
	expect(restSequence(d)).toEqual([90, 0])
})

test('an exercise with no sets is not a rest destination', () => {
	// The gap after Squat would be pointless: nothing follows it that has work.
	const d = day(ex('Squat', [makeSet({ restSec: 90 })], 180), ex('Empty', [], 180))
	expect(restSequence(d)).toEqual([0])
})

test('warm-ups rest for their own value and never claim the exercise gap', () => {
	const d = day(
		ex(
			'Bench Press',
			[
				makeSet({ kind: 'warmup', restSec: 30 }),
				makeSet({ kind: 'warmup', restSec: 30 }),
				makeSet({ restSec: 90 }),
				makeSet({ restSec: 90 })
			],
			150
		),
		ex('Row', [makeSet({ restSec: 60 })], 150)
	)
	// two warm-ups at 30, one working gap at 90, then the exercise gap at 150, then end of day.
	expect(restSequence(d)).toEqual([30, 30, 90, 150, 0])
})

test('a trailing warm-up keeps its own rest rather than the exercise gap', () => {
	// Only reachable if ordering was bypassed; the exercise gap is a working-set boundary.
	const d = day(
		ex('Curl', [makeSet({ restSec: 90 }), makeSet({ kind: 'warmup', restSec: 20 })], 120),
		ex('Row', [makeSet()], 120)
	)
	expect(restSequence(d)).toEqual([90, 20, 0])
})

test('warm-ups sort ahead of working sets and are excluded from the count', () => {
	const working = makeSet()
	const warm = makeSet({ kind: 'warmup' })
	expect(sortSets([working, warm]).map((s) => s.kind)).toEqual(['warmup', 'working'])

	const d = day(ex('Bench Press', [warm, working, makeSet()], 120))
	expect(countSets(d)).toBe(2)
})

// ---- previous-run lookup ----------------------------------------------------

function logFor(over: Partial<SessionLog>): SessionLog {
	return {
		id: over.id ?? 'l',
		routineId: 'r1',
		routineName: 'PPL',
		dayId: 'd1',
		dayName: 'Push',
		startedAt: over.startedAt ?? '2026-07-01T10:00:00.000Z',
		finishedAt: over.finishedAt ?? '2026-07-01T11:00:00.000Z',
		sets: over.sets ?? [],
		...over
	}
}

const logged = (setId: string, reps: number) => ({
	setId,
	exerciseName: 'Bench Press',
	kind: 'working' as const,
	mode: 'reps' as const,
	setIndex: 0,
	targetRepsMin: 8,
	targetRepsMax: null,
	reps,
	weight: 100,
	assumed: false
})

test('previous reps come from the most recent session of the same day', () => {
	const logs = [
		logFor({ id: 'old', finishedAt: '2026-07-01T11:00:00.000Z', sets: [logged('s1', 8)] }),
		logFor({ id: 'new', finishedAt: '2026-07-08T11:00:00.000Z', sets: [logged('s1', 10)] })
	]
	expect(previousReps(logs, 'r1', 'd1', 's1')).toBe(10)
})

test('previous reps fall back through sessions that skipped the set', () => {
	const logs = [
		logFor({ id: 'old', finishedAt: '2026-07-01T11:00:00.000Z', sets: [logged('s1', 8)] }),
		logFor({ id: 'new', finishedAt: '2026-07-08T11:00:00.000Z', sets: [logged('s2', 5)] })
	]
	expect(previousReps(logs, 'r1', 'd1', 's1')).toBe(8)
})

test('previous reps do not leak across routines, days, or empty keys', () => {
	const logs = [logFor({ sets: [logged('s1', 12)] })]
	expect(previousReps(logs, 'r2', 'd1', 's1')).toBeNull()
	expect(previousReps(logs, 'r1', 'd2', 's1')).toBeNull()
	expect(previousReps(logs, 'r1', 'd1', 'nope')).toBeNull()
	// A migrated v1 log has empty routineId/dayId/setId — those must never match each other.
	expect(
		previousReps([logFor({ routineId: '', dayId: '', sets: [logged('', 9)] })], '', '', '')
	).toBeNull()
})

// ---- duration split ---------------------------------------------------------

test('minutes and seconds round trip, and stray seconds carry', () => {
	expect(toMinSec(90)).toEqual({ min: 1, sec: 30 })
	expect(toMinSec(0)).toEqual({ min: 0, sec: 0 })
	expect(fromMinSec(1, 30)).toBe(90)
	expect(fromMinSec(0, 90)).toBe(90) // typing 90 into the seconds box means 1:30
	expect(fromMinSec(-5, NaN)).toBe(0) // an emptied box must not produce NaN seconds
})

// ---- session -> log ---------------------------------------------------------

test('finishing logs only ticked sets and skips ones deleted mid-workout', () => {
	const routine = makeRoutine('PPL')
	const d = routine.days[0]
	const kept = makeSet({ targetRepsMin: 8, targetRepsMax: 12 })
	d.exercises = [ex('Bench Press', [kept, makeSet()], 120)]

	const session = makeActiveSession(routine.id, d.id)
	session.entries[kept.id] = {
		reps: 11,
		weight: 100,
		doneAt: '2026-07-26T10:00:00.000Z',
		assumed: false
	}
	session.entries['deleted-set-id'] = {
		reps: 5,
		weight: 50,
		doneAt: '2026-07-26T10:05:00.000Z',
		assumed: false
	}
	// Typed but never ticked: a draft, not a result.
	session.entries[d.exercises[0].sets[1].id] = { reps: 7, weight: 100, doneAt: '', assumed: false }

	const log = sessionToLog(session, routine, d)
	expect(log?.sets).toEqual([
		{
			setId: kept.id,
			exerciseName: 'Bench Press',
			kind: 'working',
			setIndex: 0,
			targetRepsMin: 8,
			targetRepsMax: 12,
			reps: 11,
			weight: 100,
			assumed: false,
			mode: 'reps'
		}
	])
	expect(log?.routineId).toBe(routine.id)
	expect(log?.dayId).toBe(d.id)
})

test('finishing with nothing ticked logs nothing', () => {
	const routine = makeRoutine('PPL')
	routine.days[0].exercises = [ex('Bench Press', [makeSet()], 120)]
	expect(
		sessionToLog(makeActiveSession(routine.id, routine.days[0].id), routine, routine.days[0])
	).toBeNull()
})

// ---- timed exercises --------------------------------------------------------
// A hold reuses the rep fields for seconds (see types/gym.ts), so `mode` is the only thing that
// says which unit a number is in — and it has to survive into the log, or history silently
// relabels a 30-second hang as 30 reps the moment the exercise is switched back.

test('a timed exercise logs its seconds and the mode that names them', () => {
	const routine = makeRoutine('PPL')
	const d = routine.days[0]
	const set = makeSet({ targetRepsMin: 30 })
	d.exercises = [{ ...ex('Dead Hang', [set], 120), mode: 'time' as const }]

	const session = makeActiveSession(routine.id, d.id, d.exercises)
	// What a finished hold writes: the length the clock actually ran, measured rather than assumed.
	session.entries[set.id] = {
		reps: 30,
		weight: 10,
		doneAt: '2026-07-26T10:00:00.000Z',
		assumed: false
	}

	expect(sessionToLog(session, routine, d)?.sets[0]).toMatchObject({
		exerciseName: 'Dead Hang',
		mode: 'time',
		reps: 30,
		targetRepsMin: 30,
		assumed: false
	})
})

test('switching an exercise between reps and seconds is a change to the plan', () => {
	const template = [ex('Dead Hang', [makeSet({ targetRepsMin: 30 })], 120)]
	const plan = JSON.parse(JSON.stringify(template))
	plan[0].mode = 'time'
	expect(plansDiffer(template, plan)).toBe(true)
})

test('an export written before timed holds imports as reps', () => {
	const routine = makeRoutine('Old')
	routine.days[0].exercises = [ex('Squat', [makeSet()], 120)]
	const bundle = JSON.parse(JSON.stringify(makeGymFile([routine], [])))
	delete bundle.routines[0].days[0].exercises[0].mode
	expect(readGymFile(bundle).routines[0].days[0].exercises[0].mode).toBe('reps')
})

test('an assumed rep count stays marked as assumed all the way into history', () => {
	const routine = makeRoutine('PPL')
	const d = routine.days[0]
	const set = makeSet()
	d.exercises = [ex('Squat', [set], 120)]
	const session = makeActiveSession(routine.id, d.id)
	// What ticking done with an empty reps box writes: a number nobody confirmed.
	session.entries[set.id] = {
		reps: 8,
		weight: 100,
		doneAt: '2026-07-26T10:00:00.000Z',
		assumed: true
	}
	expect(sessionToLog(session, routine, d)?.sets[0]).toMatchObject({ reps: 8, assumed: true })
})

// ---- plan divergence --------------------------------------------------------
// What decides whether Finish asks "values only, or update the day?". A false positive turns every
// ordinary session into a question; a false negative silently loses a change you meant to keep.

test('lifting differently from the plan is not a change to the plan', () => {
	const template = [ex('Bench Press', [makeSet({ weight: 100 }), makeSet({ weight: 100 })], 120)]
	const plan = JSON.parse(JSON.stringify(template))
	plan[0].sets[0].weight = 105 // went up
	plan[0].sets[1].targetRepsMin = 6 // and the goal was retyped
	plan[0].note = 'felt heavy'
	expect(plansDiffer(template, plan)).toBe(false)
})

test('added, dropped, reordered, renamed or re-setted exercises are a change to the plan', () => {
	const bench = ex('Bench Press', [makeSet(), makeSet()], 120)
	const row = ex('Row', [makeSet()], 120)
	const template = [bench, row]

	expect(plansDiffer(template, [bench])).toBe(true) // dropped
	expect(plansDiffer(template, [bench, row, ex('Curl', [makeSet()], 120)])).toBe(true) // added
	expect(plansDiffer(template, [row, bench])).toBe(true) // reordered

	const renamed = JSON.parse(JSON.stringify(template))
	renamed[0].name = 'Incline Bench Press'
	expect(plansDiffer(template, renamed)).toBe(true)

	const extraSet = JSON.parse(JSON.stringify(template))
	extraSet[1].sets.push(makeSet())
	expect(plansDiffer(template, extraSet)).toBe(true)
})

test('two exercises that only share a name are still different exercises', () => {
	// Same name, different id: swapping a lift out and back in must not read as "no change", or the
	// set ids the reps placeholders key off would silently disagree with the template.
	const a = ex('Squat', [makeSet()], 120)
	const b = ex('Squat', [makeSet()], 120)
	expect(plansDiffer([a], [b])).toBe(true)
})

// ---- session plan -----------------------------------------------------------

test('an exercise added mid-workout is logged even though the day never hears about it', () => {
	const routine = makeRoutine('PPL')
	const d = routine.days[0]
	d.exercises = [ex('Bench Press', [makeSet()], 120)]

	const session = makeActiveSession(routine.id, d.id, d.exercises)
	const added = ex('Cable Fly', [makeSet({ targetRepsMin: 12 })], 120)
	session.plan = [...session.plan, added]
	session.entries[added.sets[0].id] = {
		reps: 14,
		weight: 20,
		doneAt: '2026-07-26T10:30:00.000Z',
		assumed: false
	}

	const log = sessionToLog(session, routine, d)
	expect(log?.sets.map((s) => s.exerciseName)).toEqual(['Cable Fly'])
	// The day itself is untouched until "update the day" says otherwise.
	expect(d.exercises).toHaveLength(1)
})

test('starting a session copies the plan rather than aliasing it', () => {
	const routine = makeRoutine('PPL')
	const d = routine.days[0]
	d.exercises = [ex('Squat', [makeSet({ weight: 100 })], 120)]

	const session = makeActiveSession(routine.id, d.id, d.exercises)
	session.plan[0].sets[0].weight = 120

	expect(d.exercises[0].sets[0].weight).toBe(100)
	expect(plansDiffer(d.exercises, session.plan)).toBe(false) // a weight is not a plan change
})

// ---- file round trip -------------------------------------------------------

test('an exported file re-imports to the same routines, library, and notes', () => {
	const routine = makeRoutine('PPL')
	routine.days[0].exercises = [ex('Bench Press', [makeSet({ kind: 'warmup' }), makeSet()], 120)]
	const custom = [{ id: 'c1', name: 'Sled Push', group: 'Legs' }]
	const notes = { 'bench press': 'elbows tucked' }

	const bundle = makeGymFile([routine], [], custom, notes)
	const back = readGymFile(JSON.parse(JSON.stringify(bundle)))
	expect(back.routines).toEqual([routine])
	expect(back.customExercises).toEqual(custom)
	expect(back.exerciseNotes).toEqual(notes)
})

test('a v1 export still imports, migrating single targets and set kinds', () => {
	// Shape written by the previous version: targetReps, no kind/note/max, no routineId on logs.
	const v1 = {
		kind: 'skyray-gym',
		version: 1,
		routines: [
			{
				id: 'r1',
				name: 'Old',
				days: [
					{
						id: 'd1',
						name: 'Day 1',
						exercises: [
							{
								id: 'e1',
								name: 'Squat',
								restAfterSec: 120,
								sets: [{ id: 's1', targetReps: 5, weight: 100, restSec: 180 }]
							}
						]
					}
				]
			}
		],
		logs: [
			{
				id: 'l1',
				routineName: 'Old',
				dayName: 'Day 1',
				startedAt: '',
				finishedAt: '',
				sets: [{ exerciseName: 'Squat', setIndex: 0, targetReps: 5, reps: 5, weight: 100 }]
			}
		]
	}
	const back = readGymFile(v1)
	const set = back.routines[0].days[0].exercises[0].sets[0]
	expect(set).toMatchObject({ kind: 'working', targetRepsMin: 5, targetRepsMax: null, note: '' })
	expect(back.routines[0].days[0].exercises[0]).toMatchObject({ note: '', mode: 'reps' })
	// A v1 log has no set ids, so it must not become a placeholder source for anything.
	expect(back.logs[0].sets[0]).toMatchObject({ setId: '', kind: 'working', targetRepsMin: 5 })
	expect(previousReps(back.logs, 'r1', 'd1', 's1')).toBeNull()
})

test('import accepts a bare routine list and rejects unrelated JSON', () => {
	const routine = makeRoutine('Bare')
	expect(readGymFile(JSON.parse(JSON.stringify([routine]))).routines).toEqual([routine])
	expect(() => readGymFile({ hello: 'world' })).toThrow()
	expect(() => readGymFile([])).toThrow()
})

test('importing a routine twice replaces it rather than duplicating', () => {
	const a = makeRoutine('A')
	const merged = mergeRoutines([a], [{ ...a, name: 'A (edited)' }])
	expect(merged).toHaveLength(1)
	expect(merged[0].name).toBe('A (edited)')
})

// ---- assisted load ----------------------------------------------------------
// The machine takes weight off you, so it is stored negative and progress runs upward toward zero.
// Every load path clamped weights at zero before this existed, and a clamp anywhere silently turns
// 40 kg of assistance into a bodyweight rep.

test('a negative load survives every load path', () => {
	const pull = day(ex('Assisted Pull-up', [makeSet({ weight: -40 })]))
	const bundle = makeGymFile([{ ...makeRoutine('Pull'), days: [pull] }], [])
	expect(readGymFile(bundle).routines[0].days[0].exercises[0].sets[0].weight).toBe(-40)

	// The session is rewritten to localStorage on every tick and comes back through this normalizer.
	const session = normalizeActiveSession({
		routineId: 'r1',
		dayId: 'd1',
		entries: { s1: { reps: 6, weight: -40, doneAt: 'now', assumed: false } }
	})
	expect(session?.entries.s1.weight).toBe(-40)

	expect(normalizeLog({ sets: [{ setId: 's1', weight: -40, reps: 6 }] }).sets[0].weight).toBe(-40)
})

test('turning assistance on is a change to the plan', () => {
	const template = [ex('Assisted Dip', [makeSet({ weight: 0 })], 120)]
	const plan = JSON.parse(JSON.stringify(template))
	plan[0].assisted = true
	expect(plansDiffer(template, plan)).toBe(true)
})

test('an export written before assisted lifts existed imports as unassisted', () => {
	const bundle = JSON.parse(JSON.stringify(makeGymFile([makeRoutine('R')], [])))
	bundle.routines[0].days[0].exercises = [{ name: 'Bench Press', sets: [] }]
	expect(readGymFile(bundle).routines[0].days[0].exercises[0].assisted).toBe(false)
})

// ---- interval rounds --------------------------------------------------------
// An interval exercise is its sets: one set per round, its goal the round length in seconds, its
// `restSec` the gap before the next round. So the rest rules ARE the interval, unchanged.

test('an interval alternates round and rest and never rests after the last round', () => {
	const rounds = [
		makeSet({ targetRepsMin: 40, restSec: 20 }),
		makeSet({ targetRepsMin: 40, restSec: 20 }),
		makeSet({ targetRepsMin: 40, restSec: 20 })
	]
	const d = day({ ...ex('Tabata', rounds, 120), mode: 'interval' as const })
	// 20 between rounds; nothing after the third, because the day ends there.
	expect(restSequence(d)).toEqual([20, 20, 0])
})

test('interval rounds log as seconds under their own mode', () => {
	const set = makeSet({ targetRepsMin: 40, weight: 0 })
	const d = day({ ...ex('Battle Ropes', [set], 120), mode: 'interval' as const })
	const session = makeActiveSession('r1', d.id, d.exercises)
	session.entries[session.plan[0].sets[0].id] = {
		reps: 41,
		weight: 0,
		doneAt: 'now',
		assumed: false
	}
	const log = sessionToLog(session, makeRoutine('R'), d)!
	expect(log.sets[0].mode).toBe('interval')
	expect(log.sets[0].reps).toBe(41)
	expect(measuresSeconds(log.sets[0].mode)).toBe(true)
})

test('an unknown mode in a hand-edited file falls back to reps', () => {
	const bundle = JSON.parse(JSON.stringify(makeGymFile([makeRoutine('R')], [])))
	bundle.routines[0].days[0].exercises = [{ name: 'Bench Press', mode: 'tabata', sets: [] }]
	expect(readGymFile(bundle).routines[0].days[0].exercises[0].mode).toBe('reps')
})

test('turning assistance on flips every set, and off flips them back', () => {
	const lift = ex('Assisted Dip', [makeSet({ weight: 40 }), makeSet({ weight: 0 })], 120)
	applyAssisted(lift, true)
	expect(lift.assisted).toBe(true)
	expect(lift.sets.map((s) => s.weight)).toEqual([-40, 0])
	// Idempotent: the dialog can be reopened and the box re-ticked without doubling the sign back.
	applyAssisted(lift, true)
	expect(lift.sets.map((s) => s.weight)).toEqual([-40, 0])
	applyAssisted(lift, false)
	expect(lift.assisted).toBe(false)
	expect(lift.sets.map((s) => s.weight)).toEqual([40, 0])
})

test('the settings summary names the mode, and says so when the load assists', () => {
	const lift = ex('Battle Ropes', [makeSet()], 120)
	expect(settingsSummary(lift)).toBe('Reps')
	expect(settingsSummary({ ...lift, mode: 'interval' })).toBe('Interval rounds')
	expect(settingsSummary({ ...lift, mode: 'time', assisted: true })).toBe('Seconds held · assisted')
})
