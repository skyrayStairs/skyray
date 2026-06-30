// Unique id generator that also works in insecure contexts. `crypto.randomUUID` is only defined
// in secure contexts (https / localhost), so on a phone hitting the dev server over http it is
// undefined and throws — which silently breaks "New routine", add-exercise, file import, etc.
// `crypto.getRandomValues` has no secure-context requirement, so we fall back to a manual UUIDv4.
export function uid(): string {
	const c = globalThis.crypto
	if (c?.randomUUID) return c.randomUUID()
	if (c?.getRandomValues) {
		const b = c.getRandomValues(new Uint8Array(16))
		b[6] = (b[6] & 0x0f) | 0x40 // version 4
		b[8] = (b[8] & 0x3f) | 0x80 // variant 10
		const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
		return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
	}
	return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
