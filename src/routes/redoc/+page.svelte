<script lang="ts">
	import { onMount } from 'svelte';

	let errorMessage = '';

	const loadRedoc = () =>
		new Promise<void>((resolve, reject) => {
			if (document.getElementById('redoc-bundle')) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.id = 'redoc-bundle';
			script.src = '/redoc/redoc.standalone.js';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Redoc'));
			document.body.appendChild(script);
		});

	onMount(async () => {
		try {
			await loadRedoc();
			const redoc = (window as unknown as { Redoc?: { init: (...args: any[]) => void } }).Redoc;
			if (!redoc?.init) {
				errorMessage = 'Redoc failed to initialize.';
				return;
			}
			redoc.init('/api/openapi', {}, document.getElementById('redoc-root'));
		} catch (error) {
			console.error(error);
			errorMessage = 'Unable to load API docs.';
		}
	});
</script>

<div class="redoc-wrap">
	{#if errorMessage}
		<p>{errorMessage}</p>
	{:else}
		<div id="redoc-root"></div>
	{/if}
</div>

<style>
	.redoc-wrap {
		min-height: 100vh;
		background: #f7f7f2;
	}
</style>
