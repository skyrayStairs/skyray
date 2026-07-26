// Data model + pure helpers for the Gym tracker (/sandbox/gym).
//
// Deliberately DOM-free and import-light so tests/gym.spec.ts can pin the rest rules and the
// previous-reps lookup without a browser. `uid` is imported relatively (not via $lib) because this
// module is imported straight from the test runner, which has no SvelteKit alias config.

import { uid } from '../utils/id'

/** Rest a freshly added working set gets. Per-exercise overridable via `defaultRestSec`. */
export const DEFAULT_REST_SET_SEC = 120
export const DEFAULT_REST_WARMUP_SEC = 45
export const DEFAULT_REST_EXERCISE_SEC = 120
export const DEFAULT_TARGET_REPS = 8
export const DEFAULT_SET_COUNT = 3

/** Warm-ups are grouped ahead of working sets and excluded from working-set counts. */
export type SetKind = 'warmup' | 'working'

/**
 * One planned set. `targetRepsMax: null` means a single target rather than a range.
 * `restSec` is the rest taken after this set — see `restForSet` for when it is superseded.
 */
export type GymSet = {
	id: string
	kind: SetKind
	targetRepsMin: number
	targetRepsMax: number | null
	weight: number
	restSec: number
	note: string
}

/**
 * `note` is this exercise's note *within this routine*; the cross-routine note lives in the notes map.
 *
 * Two different rests, deliberately: `defaultRestSec` is what "+ Add set" hands a new set, and
 * `restAfterSec` is the gap crossed when the exercise is over. `restForSet` only ever reads the
 * latter — changing the former can never move a rest that is already planned.
 */
export type GymExercise = {
	id: string
	name: string
	sets: GymSet[]
	defaultRestSec: number
	restAfterSec: number
	note: string
}

export type GymDay = {
	id: string
	name: string
	exercises: GymExercise[]
}

export type GymRoutine = {
	id: string
	name: string
	days: GymDay[]
}

/** A custom exercise the built-in catalog doesn't cover. */
export type CustomExercise = {
	id: string
	name: string
	group: string
}

/** One set as actually performed. `exerciseName` is a snapshot, so renaming a lift can't rewrite history. */
export type LoggedSet = {
	setId: string
	exerciseName: string
	kind: SetKind
	setIndex: number
	targetRepsMin: number
	targetRepsMax: number | null
	reps: number
	weight: number
	/** True when `reps` was filled in by ticking done rather than entered. Carried into history. */
	assumed: boolean
}

export type SessionLog = {
	id: string
	routineId: string
	routineName: string
	dayId: string
	dayName: string
	startedAt: string // ISO
	finishedAt: string // ISO
	sets: LoggedSet[]
}

/**
 * An entry exists as soon as reps are typed, so a half-filled row survives a reload. `doneAt` is
 * what makes it *done*: empty means the number is only a draft and won't reach the log.
 *
 * `assumed` means nobody entered that number — ticking done with an empty box fills in last week's
 * reps (or the target) to keep logging to one tap. It has to stay distinguishable from a number the
 * lifter actually confirmed, in the UI and in history, or the log quietly becomes fiction.
 */
export type SessionEntry = { reps: number; weight: number; doneAt: string; assumed: boolean }

/**
 * The workout in progress. Persisted on every tick so a mid-workout reload doesn't lose it, and
 * committed to a SessionLog by "Finish".
 *
 * `plan` is a *copy* of the day's exercises taken when the workout started, and it is what the
 * runner edits. That copy is the whole reason finishing can ask "values only, or update the
 * template?": mutating the day in place would have already answered the question by the time it
 * gets asked. Everything downstream — the log, the rest rules, the reps placeholders — reads the
 * session plan, so an exercise added mid-workout is real work immediately and only becomes part of
 * the template if you say so.
 */
export type ActiveSession = {
	routineId: string
	dayId: string
	startedAt: string
	plan: GymExercise[]
	entries: Record<string, SessionEntry> // keyed by set id
}

// ---- Factories ---------------------------------------------------------------

export function makeSet(init: Partial<Omit<GymSet, 'id'>> = {}): GymSet {
	const kind = init.kind ?? 'working'
	return {
		id: uid(),
		kind,
		targetRepsMin: init.targetRepsMin ?? DEFAULT_TARGET_REPS,
		targetRepsMax: init.targetRepsMax ?? null,
		weight: init.weight ?? 0,
		restSec: init.restSec ?? (kind === 'warmup' ? DEFAULT_REST_WARMUP_SEC : DEFAULT_REST_SET_SEC),
		note: init.note ?? ''
	}
}

export function makeExercise(name = '', setCount = DEFAULT_SET_COUNT): GymExercise {
	return {
		id: uid(),
		name,
		sets: Array.from({ length: Math.max(0, setCount) }, () => makeSet()),
		defaultRestSec: DEFAULT_REST_SET_SEC,
		restAfterSec: DEFAULT_REST_EXERCISE_SEC,
		note: ''
	}
}

export function makeDay(name = 'Day 1'): GymDay {
	return { id: uid(), name, exercises: [] }
}

export function makeRoutine(name = 'New routine'): GymRoutine {
	return { id: uid(), name, days: [makeDay()] }
}

/**
 * Deep copy of plan data. JSON rather than `structuredClone` because every caller hands this a
 * Svelte `$state` proxy, which `structuredClone` refuses; the plan is plain JSON by construction.
 */
export function clonePlan(exercises: GymExercise[]): GymExercise[] {
	return JSON.parse(JSON.stringify(exercises ?? []))
}

export function makeActiveSession(
	routineId: string,
	dayId: string,
	plan: GymExercise[] = []
): ActiveSession {
	return {
		routineId,
		dayId,
		startedAt: new Date().toISOString(),
		plan: clonePlan(plan),
		entries: {}
	}
}

// ---- Set ordering + rest rules ----------------------------------------------

/** Warm-ups ahead of working sets, order preserved within each group. */
export function sortSets(sets: GymSet[]): GymSet[] {
	const warmups = sets.filter((s) => s.kind === 'warmup')
	const working = sets.filter((s) => s.kind !== 'warmup')
	return [...warmups, ...working]
}

/** Working sets only — warm-ups don't count toward the day's volume or the day-tab number. */
export function countSets(day: GymDay): number {
	return (day.exercises ?? []).reduce(
		(n, ex) => n + (ex.sets ?? []).filter((s) => s.kind !== 'warmup').length,
		0
	)
}

export function workingSets(ex: GymExercise): GymSet[] {
	return (ex.sets ?? []).filter((s) => s.kind !== 'warmup')
}

/**
 * Has the *shape* of the workout drifted from the day it was started from — different exercises, a
 * different order, or a different number of sets? This is the question "Finish" asks before it
 * decides whether to offer to rewrite the template.
 *
 * Values are pointedly not compared. Lifting 5 kg more than planned is the normal case and must
 * never provoke a prompt; adding an exercise or a fourth set is a change to the plan itself.
 */
export function plansDiffer(template: GymExercise[], plan: GymExercise[]): boolean {
	const a = template ?? []
	const b = plan ?? []
	if (a.length !== b.length) return true
	return a.some((ex, i) => {
		const other = b[i]
		return (
			ex.id !== other.id ||
			displayName(ex.name) !== displayName(other.name) ||
			(ex.sets?.length ?? 0) !== (other.sets?.length ?? 0)
		)
	})
}

/**
 * How long to rest after ticking a given set.
 *
 * Rules, all pinned by tests/gym.spec.ts:
 *  - a set that has more sets after it in the same exercise rests for its own `restSec`;
 *  - the last set of an exercise rests for `restAfterSec`, the exercise gap — never both;
 *  - the last set of the *last* exercise with any work rests for 0: the day is over, and v1's
 *    flattened run order made the same guarantee (no trailing rest);
 *  - a trailing warm-up (only reachable if ordering was bypassed) uses its own rest, since it isn't
 *    the working-set boundary the exercise gap is meant for.
 *
 * Takes the whole day rather than the exercise because the end-of-day case can't be seen otherwise.
 */
export function restForSet(day: GymDay, exerciseIndex: number, setIndex: number): number {
	const ex = day?.exercises?.[exerciseIndex]
	const set = ex?.sets?.[setIndex]
	if (!ex || !set) return 0

	const own = Math.max(0, Math.round(set.restSec))
	if (setIndex < ex.sets.length - 1) return own
	if (set.kind === 'warmup') return own

	const moreWorkToday =
		ex.sets.length > 0 &&
		(day.exercises ?? []).slice(exerciseIndex + 1).some((e) => (e.sets?.length ?? 0) > 0)
	return moreWorkToday ? Math.max(0, Math.round(ex.restAfterSec)) : 0
}

// ---- Previous-run lookup -----------------------------------------------------

/**
 * Reps recorded for this set the last time this day was finished — the faint placeholder in the
 * reps box. Matched by set id within the same routine + day, so the same lift in another routine at
 * another weight can't bleed in. All three keys must be non-empty: migrated v1 logs default them to
 * '' and would otherwise all match each other.
 */
export function previousReps(
	logs: SessionLog[],
	routineId: string,
	dayId: string,
	setId: string
): number | null {
	if (!routineId || !dayId || !setId) return null
	const sameDay = (logs ?? [])
		.filter((l) => l.routineId === routineId && l.dayId === dayId)
		.sort((a, b) => (a.finishedAt || a.startedAt).localeCompare(b.finishedAt || b.startedAt))

	// Newest first; fall back through older sessions when the newest skipped this set.
	for (let i = sameDay.length - 1; i >= 0; i--) {
		const hit = sameDay[i].sets.find((s) => s.setId === setId)
		if (hit) return hit.reps
	}
	return null
}

// ---- Duration split ---------------------------------------------------------

export function toMinSec(totalSec: number): { min: number; sec: number } {
	const s = Math.max(0, Math.round(num(totalSec)))
	return { min: Math.floor(s / 60), sec: s % 60 }
}

/** Seconds over 59 carry into minutes, so typing 90 in the seconds box means 1:30. */
export function fromMinSec(min: number, sec: number): number {
	return Math.max(0, Math.floor(num(min))) * 60 + Math.max(0, Math.floor(num(sec)))
}

// ---- Session -> log ---------------------------------------------------------

/**
 * Commit an open session. Walks the *session's own plan* rather than the entries, so an entry whose
 * set was deleted mid-workout is skipped instead of throwing, and so an exercise added mid-workout
 * is logged even when the template never hears about it. Falls back to the day for sessions saved
 * before the plan snapshot existed. Entries without a `doneAt` are typed-but-not-ticked drafts and
 * don't reach the log. Returns null when nothing was ticked.
 */
export function sessionToLog(
	session: ActiveSession,
	routine: GymRoutine,
	day: GymDay
): SessionLog | null {
	const sets: LoggedSet[] = []
	for (const ex of session.plan?.length ? session.plan : (day.exercises ?? [])) {
		;(ex.sets ?? []).forEach((set, setIndex) => {
			const entry = session.entries?.[set.id]
			if (!entry || !entry.doneAt) return
			sets.push({
				setId: set.id,
				exerciseName: displayName(ex.name),
				kind: set.kind,
				setIndex,
				targetRepsMin: set.targetRepsMin,
				targetRepsMax: set.targetRepsMax,
				reps: entry.reps,
				weight: entry.weight,
				assumed: !!entry.assumed
			})
		})
	}
	if (!sets.length) return null
	return {
		id: uid(),
		routineId: routine.id,
		routineName: routine.name,
		dayId: day.id,
		dayName: day.name,
		startedAt: session.startedAt,
		finishedAt: new Date().toISOString(),
		sets
	}
}

// ---- Normalization ----------------------------------------------------------
// Runs on BOTH load paths (localStorage and file import). Imported files are hand-editable, so
// every field is coerced rather than trusted: a missing id breaks keyed each-blocks, and a string
// where a number belongs breaks the timer arithmetic silently. Also migrates v1 (single
// `targetReps`, no kind/note/setId) forward in place.

function num(v: unknown, fallback = 0): number {
	const n = typeof v === 'string' ? parseFloat(v) : v
	return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function str(v: unknown, fallback = ''): string {
	return typeof v === 'string' ? v : fallback
}

/** Exercises can be added before they're named; the log and the runner still need something to show. */
export function displayName(name: string): string {
	return str(name).trim() || 'Exercise'
}

function normalizeSet(raw: unknown): GymSet {
	const s = (raw ?? {}) as Partial<GymSet> & { targetReps?: unknown }
	// v1 stored one `targetReps`; v2 stores a min with an optional max.
	const min = Math.max(0, Math.round(num(s.targetRepsMin ?? s.targetReps, DEFAULT_TARGET_REPS)))
	const max =
		s.targetRepsMax === null || s.targetRepsMax === undefined
			? null
			: Math.max(min, Math.round(num(s.targetRepsMax, min)))
	const kind: SetKind = s.kind === 'warmup' ? 'warmup' : 'working'
	return {
		id: str(s.id) || uid(),
		kind,
		targetRepsMin: min,
		targetRepsMax: max,
		weight: Math.max(0, num(s.weight)),
		restSec: Math.max(
			0,
			Math.round(num(s.restSec, kind === 'warmup' ? DEFAULT_REST_WARMUP_SEC : DEFAULT_REST_SET_SEC))
		),
		note: str(s.note)
	}
}

function normalizeExercise(raw: unknown): GymExercise {
	const ex = (raw ?? {}) as Partial<GymExercise>
	return {
		id: str(ex.id) || uid(),
		name: str(ex.name),
		// Sorted here so "last set of the exercise" is unambiguous on every load path.
		sets: sortSets(Array.isArray(ex.sets) ? ex.sets.map(normalizeSet) : []),
		defaultRestSec: Math.max(0, Math.round(num(ex.defaultRestSec, DEFAULT_REST_SET_SEC))),
		restAfterSec: Math.max(0, Math.round(num(ex.restAfterSec, DEFAULT_REST_EXERCISE_SEC))),
		note: str(ex.note)
	}
}

function normalizeDay(raw: unknown, index: number): GymDay {
	const d = (raw ?? {}) as Partial<GymDay>
	return {
		id: str(d.id) || uid(),
		name: str(d.name, `Day ${index + 1}`),
		exercises: Array.isArray(d.exercises) ? d.exercises.map(normalizeExercise) : []
	}
}

export function normalizeRoutine(raw: unknown): GymRoutine {
	const r = (raw ?? {}) as Partial<GymRoutine>
	const days = Array.isArray(r.days) ? r.days.map(normalizeDay) : []
	return {
		id: str(r.id) || uid(),
		name: str(r.name, 'Routine'),
		days: days.length ? days : [makeDay()]
	}
}

export function normalizeRoutines(raw: unknown): GymRoutine[] {
	return Array.isArray(raw) ? raw.map(normalizeRoutine) : []
}

function normalizeLoggedSet(raw: unknown): LoggedSet {
	const v = (raw ?? {}) as Partial<LoggedSet> & { targetReps?: unknown }
	const min = Math.max(0, Math.round(num(v.targetRepsMin ?? v.targetReps)))
	return {
		setId: str(v.setId),
		exerciseName: displayName(str(v.exerciseName)),
		kind: v.kind === 'warmup' ? 'warmup' : 'working',
		setIndex: Math.max(0, Math.round(num(v.setIndex))),
		targetRepsMin: min,
		targetRepsMax:
			v.targetRepsMax === null || v.targetRepsMax === undefined
				? null
				: Math.max(min, Math.round(num(v.targetRepsMax, min))),
		reps: Math.max(0, Math.round(num(v.reps))),
		weight: Math.max(0, num(v.weight)),
		assumed: v.assumed === true
	}
}

export function normalizeLog(raw: unknown): SessionLog {
	const l = (raw ?? {}) as Partial<SessionLog>
	return {
		id: str(l.id) || uid(),
		routineId: str(l.routineId),
		routineName: str(l.routineName, 'Routine'),
		dayId: str(l.dayId),
		dayName: str(l.dayName, 'Day'),
		startedAt: str(l.startedAt),
		finishedAt: str(l.finishedAt),
		sets: Array.isArray(l.sets) ? l.sets.map(normalizeLoggedSet) : []
	}
}

export function normalizeLogs(raw: unknown): SessionLog[] {
	return Array.isArray(raw) ? raw.map(normalizeLog) : []
}

export function normalizeCustomExercises(raw: unknown): CustomExercise[] {
	if (!Array.isArray(raw)) return []
	return raw.map((r) => {
		const c = (r ?? {}) as Partial<CustomExercise>
		return {
			id: str(c.id) || uid(),
			name: str(c.name).trim() || 'Exercise',
			group: str(c.group).trim() || 'Custom'
		}
	})
}

/** Global notes are keyed by name, so a built-in lift can carry one without being copied into storage. */
export function noteKey(name: string): string {
	return str(name).trim().toLowerCase()
}

export function normalizeNotes(raw: unknown): Record<string, string> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
	const out: Record<string, string> = {}
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const key = noteKey(k)
		if (key && typeof v === 'string' && v.trim()) out[key] = v
	}
	return out
}

export function normalizeActiveSession(raw: unknown): ActiveSession | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
	const s = raw as Partial<ActiveSession>
	if (!str(s.routineId) || !str(s.dayId)) return null
	const entries: Record<string, SessionEntry> = {}
	for (const [k, v] of Object.entries(s.entries ?? {})) {
		const e = (v ?? {}) as Partial<SessionEntry>
		if (!k) continue
		entries[k] = {
			reps: Math.max(0, Math.round(num(e.reps))),
			weight: Math.max(0, num(e.weight)),
			doneAt: str(e.doneAt),
			assumed: e.assumed === true
		}
	}
	return {
		routineId: str(s.routineId),
		dayId: str(s.dayId),
		startedAt: str(s.startedAt) || new Date().toISOString(),
		// Empty for a session saved before plans were snapshotted; sessionToLog falls back to the day.
		plan: Array.isArray(s.plan) ? s.plan.map(normalizeExercise) : [],
		entries
	}
}

// ---- File round trip --------------------------------------------------------

export const GYM_FILE_KIND = 'skyray-gym'

export type GymFile = {
	kind: typeof GYM_FILE_KIND
	version: 2
	exportedAt: string
	routines: GymRoutine[]
	logs: SessionLog[]
	customExercises: CustomExercise[]
	exerciseNotes: Record<string, string>
}

export function makeGymFile(
	routines: GymRoutine[],
	logs: SessionLog[],
	customExercises: CustomExercise[] = [],
	exerciseNotes: Record<string, string> = {}
): GymFile {
	return {
		kind: GYM_FILE_KIND,
		version: 2,
		exportedAt: new Date().toISOString(),
		routines,
		logs,
		customExercises,
		exerciseNotes
	}
}

export type GymFileContents = {
	routines: GymRoutine[]
	logs: SessionLog[]
	customExercises: CustomExercise[]
	exerciseNotes: Record<string, string>
}

/**
 * Parse an imported file. Accepts a v2 or v1 bundle, a bare array of routines, or a single routine
 * object, so a hand-trimmed file still loads. Throws when nothing routine-shaped is found —
 * silently importing zero routines reads as data loss.
 */
export function readGymFile(raw: unknown): GymFileContents {
	const empty = { customExercises: [], exerciseNotes: {} }
	if (Array.isArray(raw)) {
		const routines = normalizeRoutines(raw)
		if (!routines.length) throw new Error('File contains no routines.')
		return { routines, logs: [], ...empty }
	}
	const obj = (raw ?? {}) as Record<string, unknown>
	if (Array.isArray(obj.routines)) {
		return {
			routines: normalizeRoutines(obj.routines),
			logs: normalizeLogs(obj.logs),
			customExercises: normalizeCustomExercises(obj.customExercises),
			exerciseNotes: normalizeNotes(obj.exerciseNotes)
		}
	}
	if (Array.isArray(obj.days)) return { routines: [normalizeRoutine(obj)], logs: [], ...empty }
	throw new Error('Unrecognised file: expected a gym export or a list of routines.')
}

/** Merge imported routines into the library, replacing same-id entries and appending the rest. */
export function mergeRoutines(current: GymRoutine[], incoming: GymRoutine[]): GymRoutine[] {
	const byId = new Map(current.map((r) => [r.id, r]))
	for (const r of incoming) byId.set(r.id, r)
	return [...byId.values()]
}

/** Same merge for logs, oldest first. */
export function mergeLogs(current: SessionLog[], incoming: SessionLog[]): SessionLog[] {
	const byId = new Map(current.map((l) => [l.id, l]))
	for (const l of incoming) byId.set(l.id, l)
	return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/** Custom exercises merge by name (case-insensitive) — the same lift imported twice is one entry. */
export function mergeCustomExercises(
	current: CustomExercise[],
	incoming: CustomExercise[]
): CustomExercise[] {
	const byName = new Map(current.map((c) => [noteKey(c.name), c]))
	for (const c of incoming) if (!byName.has(noteKey(c.name))) byName.set(noteKey(c.name), c)
	return [...byName.values()]
}
