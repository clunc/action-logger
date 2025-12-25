import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/routes/**/+*.*'] // SvelteKit route files use + prefix; keep tests outside those filenames
	},
	resolve: {
		conditions: ['browser', 'module', 'import']
	}
});
