<script lang="ts">
	import type { SessionTask } from '$lib/types';

	export let task: SessionTask;
	export let taskIdx: number;
	export let onLogSubtask: (taskIdx: number, subtaskIdx: number) => void;
	export let onUndoSubtask: (taskIdx: number, subtaskIdx: number) => void;
	export let recurrenceLabel: string = 'Daily';
	export let pillarLabel: string | undefined = undefined;
	export let pillarEmoji: string | undefined = undefined;

	$: isPicked = task.subtasks.some((subtask) => subtask.completed);
</script>

<section class={`card ${isPicked ? 'picked' : ''}`}>
	<header class="card-header">
		<div class="card-row top">
			<div class="recurrence-pill" aria-label="Recurring task">
				<span class="pill-icon">🔁</span>
				{recurrenceLabel}
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
					<button
						class={`check-btn ${subtask.completed ? 'done' : ''}`}
						aria-label={subtask.completed ? 'Undo todo' : 'Complete todo'}
						on:click={() =>
							subtask.completed
								? onUndoSubtask(taskIdx, subtaskIdx)
								: onLogSubtask(taskIdx, subtaskIdx)}
						type="button"
					>
						{subtask.completed ? '✕' : '✓'}
					</button>
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
</style>
