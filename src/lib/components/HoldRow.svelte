<script lang="ts">
	import type { SubtaskEntry } from '$lib/types';

export let subtask: SubtaskEntry;
	export let taskIdx: number;
	export let subtaskIdx: number;
	export let onLogHold: (taskIdx: number, subtaskIdx: number) => void;
	export let onUndoHold: (taskIdx: number, subtaskIdx: number) => void;
	export let subtaskLabel: string | null = null;
	export let totalSubtasks = 1;

	$: actionLabel = '✓';
	$: actionAriaLabel = 'Mark action complete';
	$: displayLabel = subtaskLabel ?? `Action${totalSubtasks > 1 ? ` ${subtask.subtaskNumber}` : ''}`;
</script>

<div class="set-row">
	{#if displayLabel}
		<div class="set-number">{displayLabel}</div>
	{/if}

	<div class="set-actions">
		{#if subtask.completed}
			<button
				class="log-btn undo-btn"
				aria-label="Undo action"
				on:click={() => onUndoHold(taskIdx, subtaskIdx)}
				type="button"
			>
				✕
			</button>
		{:else}
			<button
				class="log-btn"
				aria-label={actionAriaLabel}
				on:click={() => onLogHold(taskIdx, subtaskIdx)}
				type="button"
			>
				{actionLabel}
			</button>
		{/if}
	</div>
</div>

<style>
	.set-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 10px 8px;
		border-bottom: 1px solid #f0f0f0;
	}

	.set-row:last-child {
		border-bottom: none;
	}

	.set-number {
		font-weight: 700;
		color: #233143;
		font-size: 15px;
		letter-spacing: 0.02em;
		flex: 1;
	}

	.log-btn {
		background: #007aff;
		color: white;
		border: none;
		padding: 0 14px;
		min-width: 64px;
		height: 44px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
		transition: transform 0.08s ease, box-shadow 0.12s ease;
		position: relative;
	}

	.log-btn:active {
		background: #0051d5;
		transform: translateY(1px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
	}

	.log-btn.undo-btn {
		background: #ff3b30;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
	}

	.log-btn.undo-btn:active {
		background: #d32f2f;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
	}

	.log-btn:disabled {
		background: #c8cdd6;
		cursor: not-allowed;
		box-shadow: none;
	}

	@media (max-width: 540px) {
		.set-row {
			align-items: flex-start;
			flex-direction: row;
		}
	}

	@media (max-width: 420px) {
		.log-btn {
			height: 40px;
			border-radius: 9px;
			font-size: 12px;
		}
	}
</style>
