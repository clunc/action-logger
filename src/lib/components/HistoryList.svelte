<script lang="ts">
	import type { HistoryEntry } from '$lib/types';
	import { formatTimestamp } from '$lib/tasks';

export let entries: HistoryEntry[] = [];
export let subtaskLabelsMap: Record<string, string[] | undefined> = {};

const formatEntryLabel = (entry: HistoryEntry) => {
	const key = entry.taskId ?? entry.task;
	const labels = subtaskLabelsMap[key];
	const label = labels?.[entry.subtaskNumber - 1];
	return label ? `${entry.task} - ${label}` : entry.task;
};
</script>

{#if entries.length > 0}
	<section class="history-section">
		<div class="history-title">Today's Actions</div>
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
