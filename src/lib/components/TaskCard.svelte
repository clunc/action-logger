<script lang="ts">
	import type { SessionTask } from '$lib/types';

	export let task: SessionTask;
	export let taskIdx: number;
	export let onLogSubtask: (taskIdx: number, subtaskIdx: number, status?: 'done' | 'skipped') => void;
	export let onUndoSubtask: (taskIdx: number, subtaskIdx: number) => void;
	export let recurrenceLabel: string = 'Daily';
	export let pillarLabel: string | undefined = undefined;
	export let pillarEmoji: string | undefined = undefined;
	export let onDelete: (() => void) | null = null;
	export let onSkipSubtask: (taskIdx: number, subtaskIdx: number) => void;

	$: isPicked = task.subtasks.some((subtask) => subtask.completed);
	$: recurrenceIcon = recurrenceLabel.startsWith('One-off') ? '📌' : '🔁';
</script>

<section class={`card ${isPicked ? 'picked' : ''}`}>
	<header class="card-header">
		<div class="card-row top">
			<div class="pill-row">
				<div class="recurrence-pill" aria-label="Recurring task">
					<span class="pill-icon">{recurrenceIcon}</span>
					{recurrenceLabel}
				</div>
				{#if onDelete}
					<button class="delete-pill" type="button" on:click={onDelete} aria-label="Delete task">
						<span aria-hidden="true">✕</span> Remove
					</button>
				{/if}
			</div>
			{#if pillarLabel}
				<div class="pillar-pill" aria-label="Pillar">
					{#if pillarEmoji}
						<span class="pill-icon">{pillarEmoji}</span>
					{/if}
					{pillarLabel}
				</div>
			{/if}
		</div>
		<div class="card-row bottom">
			<div class="title-text">{task.name}</div>
			<div class="card-actions">
				{#each task.subtasks as subtask, subtaskIdx}
					<div class="subtask-actions">
						<button
							class={`check-btn ${subtask.status === 'done' ? 'done' : ''} ${subtask.status === 'skipped' ? 'skipped' : ''}`}
							aria-label={subtask.status === 'done' ? 'Undo action' : 'Complete action'}
							on:click={() =>
								subtask.status === 'done'
									? onUndoSubtask(taskIdx, subtaskIdx)
									: onLogSubtask(taskIdx, subtaskIdx, 'done')}
							type="button"
						>
							{subtask.status === 'done' ? '✕' : '✓'}
						</button>
						<button
							class={`skip-btn ${subtask.status === 'skipped' ? 'on' : ''}`}
							type="button"
							aria-label={subtask.status === 'skipped' ? 'Undo skip' : 'Skip action'}
							on:click={() =>
								subtask.status === 'skipped'
									? onUndoSubtask(taskIdx, subtaskIdx)
									: onSkipSubtask(taskIdx, subtaskIdx)}
						>
							{subtask.status === 'skipped' ? '↺' : '⇥'}
						</button>
					</div>
				{/each}
			</div>
		</div>
	</header>
</section>

<style>
	.card {
		background: white;
		border-radius: 12px;
		margin-bottom: 15px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		border: 1px solid #eef1f6;
	}

	.card.picked {
		background: #ecfdf3;
		border-color: #bbf7d0;
		box-shadow: 0 4px 14px rgba(16, 185, 129, 0.18);
	}

	.card-header {
		padding: 14px 16px;
		border-bottom: 1px solid #f3f4f6;
		display: grid;
		grid-template-columns: 1fr;
		row-gap: 10px;
	}

	.card-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title-text {
		display: inline-flex;
		align-items: center;
		font-size: 18px;
		font-weight: 600;
		color: #172133;
	}

	.recurrence-pill,
	.pillar-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #f1f5f9;
		color: #0f172a;
		border: 1px solid #e2e8f0;
		border-radius: 999px;
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 700;
	}

	.pillar-pill {
		background: #eef2ff;
		border-color: #c7d2fe;
		color: #4338ca;
	}

	.pill-icon {
		font-size: 14px;
	}

	.pill-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.card-actions {
		display: flex;
		gap: 10px;
	}

	.check-btn {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 1px solid #c7eed8;
		background: #e9f9ef;
		color: #0f172a;
		font-size: 18px;
		font-weight: 800;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease, border-color 0.12s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}

	.check-btn:hover {
		background: #d9f3e6;
		border-color: #b3e6cc;
	}

	.check-btn:active {
		transform: translateY(1px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
		background: #b7e7d0;
		border-color: #86d9b1;
	}

	.check-btn.done {
		background: #fecdd3;
		border-color: #fca5a5;
		color: #b91c1c;
	}

	.check-btn.done:hover {
		background: #fca5a5;
		border-color: #ef4444;
		color: #7f1d1d;
	}

	.check-btn.done:active {
		background: #dc2626;
		border-color: #b91c1c;
		color: white;
	}

	.check-btn.skipped {
		background: #e2e8f0;
		border-color: #cbd5e1;
		color: #0f172a;
	}

	.skip-btn {
		height: 42px;
		border-radius: 12px;
		border: 1px dashed #cbd5e1;
		background: white;
		color: #475569;
		font-size: 13px;
		font-weight: 700;
		padding: 0 10px;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.skip-btn:hover {
		border-color: #94a3b8;
		color: #0f172a;
	}

	.skip-btn.on {
		background: #f8fafc;
		border-color: #cbd5e1;
		color: #0f172a;
	}

	.subtask-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.delete-pill {
		padding: 4px 10px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border-radius: 999px;
		border: 1px solid #e2e8f0;
		background: transparent;
		color: #475569;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.delete-pill:hover {
		background: #fff1f2;
		border-color: #fecdd3;
		color: #b91c1c;
	}

	.delete-pill:focus-visible {
		outline: 2px solid #fecdd3;
		outline-offset: 2px;
	}
</style>
