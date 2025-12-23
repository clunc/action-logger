<script lang="ts">
	import type { SessionStretch } from '$lib/types';

export let stretch: SessionStretch;
export let stretchIdx: number;
export let onLogHold: (stretchIdx: number, holdIdx: number) => void;
export let onUndoHold: (stretchIdx: number, holdIdx: number) => void;

	$: isPicked = stretch.holds.some((hold) => hold.completed);
</script>

<section class={`card ${isPicked ? 'picked' : ''}`}>
	<header class="card-header">
		<div class="card-title">{stretch.name}</div>
		<div class="card-actions">
			{#each stretch.holds as hold, holdIdx}
				<button
					class={`check-btn ${hold.completed ? 'done' : ''}`}
					aria-label={hold.completed ? 'Undo todo' : 'Complete todo'}
					on:click={() =>
						hold.completed
							? onUndoHold(stretchIdx, holdIdx)
							: onLogHold(stretchIdx, holdIdx)}
					type="button"
				>
					{hold.completed ? '✕' : '✓'}
				</button>
			{/each}
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.card-title {
		font-size: 18px;
		font-weight: 600;
		color: #172133;
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
