// Shared JSON file I/O helpers used by the save/load buttons on the toolkit pages
// (spell-sets, guitar routines). Keeps the Blob/FileReader plumbing in one place.

/** Trigger a browser download of `data` serialized as pretty-printed JSON. */
export function downloadJson(filename: string, data: unknown): void {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

/** Read a user-picked File and parse it as JSON. Rejects if it isn't valid JSON. */
export function readJsonFile(file: File): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			try {
				resolve(JSON.parse(reader.result as string))
			} catch (err) {
				reject(err)
			}
		}
		reader.onerror = () => reject(reader.error)
		reader.readAsText(file)
	})
}
