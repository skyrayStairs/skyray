import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		watch: {
			// `build/` is adapter-static's output and `graphify-out/` is a generated knowledge graph;
			// neither feeds the dev server. Watching them killed it outright on Windows — a rebuild while
			// `npm run dev` was up threw EBUSY on a locked asset, and chokidar turns that into an
			// uncaught 'error' event that takes the process with it.
			ignored: ['**/build/**', '**/graphify-out/**']
		}
	}
});
