<script lang="ts">
	import type { HistoryEntry } from '$lib/types';
	import { formatTimestamp } from '$lib/stretch';

	export let entries: HistoryEntry[] = [];
	export let holdLabelsMap: Record<string, string[] | undefined> = {};

	const formatEntryLabel = (entry: HistoryEntry) => {
		const labels = holdLabelsMap[entry.stretch];
		const label = labels?.[entry.holdNumber - 1];
		return label ? `${entry.stretch} - ${label}` : entry.stretch;
	};
</script>

{#if entries.length > 0}
	<section class="history-section">
		<div class="history-title">Today's Todos</div>
		{#each entries as entry}
			<article class="history-card">
				<div class="history-header">
					<span class="history-exercise">{formatEntryLabel(entry)}</span>
					<span class="history-date">{formatTimestamp(entry.timestamp)}</span>
				</div>
				<div class="history-set">
					{#if entry.durationSeconds > 0}
						Completed in {entry.durationSeconds} seconds
					{:else}
						Completed
					{/if}
				</div>
			</article>
		{/each}
	</section>
{/if}

<style>
	.history-section {
		margin-top: 30px;
	}

	.history-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 15px;
		color: #333;
	}

	.history-card {
		background: white;
		border-radius: 12px;
		margin-bottom: 10px;
		padding: 15px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.history-exercise {
		font-weight: 600;
		color: #333;
	}

	.history-date {
		font-size: 13px;
		color: #999;
	}

	.history-set {
		font-size: 14px;
		color: #666;
		padding: 4px 0;
	}

	@media (max-width: 540px) {
		.history-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.history-date {
			font-size: 12px;
		}
	}
</style>
