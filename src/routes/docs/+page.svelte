<svelte:head>
	<link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	let errorMessage = '';

	const loadSwaggerUi = () =>
		new Promise<void>((resolve, reject) => {
			if (document.getElementById('swagger-ui-bundle')) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.id = 'swagger-ui-bundle';
			script.src = '/swagger-ui/swagger-ui-bundle.js';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Swagger UI'));
			document.body.appendChild(script);
		});

	onMount(async () => {
		try {
			await loadSwaggerUi();
			const swaggerUi = (window as unknown as { SwaggerUIBundle?: (options: any) => void })
				.SwaggerUIBundle;
			if (typeof swaggerUi !== 'function') {
				errorMessage = 'Swagger UI failed to initialize.';
				return;
			}
			swaggerUi({
				url: '/api/openapi',
				dom_id: '#swagger-ui',
				presets: [swaggerUi.presets.apis],
				layout: 'BaseLayout'
			});
		} catch (error) {
			console.error(error);
			errorMessage = 'Unable to load API docs.';
		}
	});
</script>

<div class="swagger-wrap">
	{#if errorMessage}
		<p>{errorMessage}</p>
	{:else}
		<div id="swagger-ui"></div>
	{/if}
</div>

<style>
	.swagger-wrap {
		min-height: 100vh;
		background: #f7f7f2;
	}

	.swagger-wrap :global(.swagger-ui) {
		font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
	}

	.swagger-wrap :global(.swagger-ui .topbar) {
		background: #111;
	}
</style>
