// IndexedDB storage for local video files. Blobs are too large/binary for localStorage and
// don't belong in the routine JSON, so they live here keyed by a generated fileId that the
// exercise's VideoConfig references.

const DB_NAME = 'guitar-routine'
const STORE = 'videos'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION)
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE)
			}
		}
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})
	return dbPromise
}

/**
 * Store a video blob. Rejects on quota/IO failure — callers must NOT persist an exercise
 * whose fileId points at a blob that never landed.
 */
export async function putVideoBlob(id: string, blob: Blob): Promise<void> {
	const db = await openDb()
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		tx.objectStore(STORE).put(blob, id)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
		tx.onabort = () => reject(tx.error)
	})
}

export async function getVideoBlob(id: string): Promise<Blob | undefined> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly')
		const req = tx.objectStore(STORE).get(id)
		req.onsuccess = () => resolve(req.result as Blob | undefined)
		req.onerror = () => reject(req.error)
	})
}

export async function deleteVideoBlob(id: string): Promise<void> {
	const db = await openDb()
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		tx.objectStore(STORE).delete(id)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}
