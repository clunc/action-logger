<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import StretchCard from '$lib/components/StretchCard.svelte';
	import HistoryList from '$lib/components/HistoryList.svelte';
	import { appendHistory, deleteHistoryEntry, fetchHistory } from '$lib/api/history';
	import { createSession, todayString } from '$lib/stretch';
	import type { HistoryEntry, SessionStretch, StretchTemplate, OneOffTask } from '$lib/types';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;

	let history: HistoryEntry[] = [];
	let currentSession: SessionStretch[] = [];
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let ready = false;
	let loadError = '';
	let templateVersion = data.templateVersion;
	let oneOffs: OneOffTask[] = data.oneOffs ?? [];

	onMount(async () => {
		try {
			history = await fetchHistory();
		} catch (error) {
			console.error(error);
			loadError = 'Could not load history. Changes will not be saved.';
		} finally {
			currentSession = createSession(data.stretchTemplate, history);
			ready = true;
			pollInterval = setInterval(syncHistory, 15000);
			if (import.meta.env.DEV) {
				startTemplateWatcher();
			}
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	async function syncHistory() {
		try {
			const latest = await fetchHistory();
			history = latest;
			currentSession = mergeInProgressSession(createSession(data.stretchTemplate, history));
		} catch (error) {
			console.error('Failed to refresh history', error);
			loadError = 'Could not refresh history from server.';
		}
	}

	async function handleHoldAction(stretchIdx: number, holdIdx: number) {
		await startHoldAndLog(stretchIdx, holdIdx);
	}

	async function startHoldAndLog(stretchIdx: number, holdIdx: number) {
		const stretch = currentSession[stretchIdx];
		const hold = stretch.holds[holdIdx];
		if (hold.completed) return;

		const timestamp = new Date().toISOString();
		const durationSeconds = 0;

		hold.completed = true;
		hold.timestamp = timestamp;
		hold.durationSeconds = durationSeconds;

		const entry: HistoryEntry = {
			stretch: stretch.name,
			holdNumber: hold.holdNumber,
			durationSeconds,
			timestamp
		};

		history = [entry, ...history];
		currentSession = [...currentSession];

		if (!loadError) {
			try {
				await appendHistory([entry]);
				await syncHistory();
			} catch (error) {
				console.error(error);
				loadError = 'Could not save history. Changes will not be saved.';
			}
		}

		// Timers removed; mark complete instantly.
	}

	async function undoHold(stretchIdx: number, holdIdx: number) {
		const stretch = currentSession[stretchIdx];
		const hold = stretch.holds[holdIdx];
		if (!hold.completed || !hold.timestamp) return;

		const entry = {
			stretch: stretch.name,
			holdNumber: hold.holdNumber,
			timestamp: hold.timestamp
		};

		try {
			await deleteHistoryEntry(entry);
			loadError = '';
		} catch (error) {
			console.error(error);
			loadError = 'Could not delete entry. History remains unchanged.';
			return;
		}

		const index = history.findIndex(
			(h) =>
				h.stretch === entry.stretch &&
				h.holdNumber === entry.holdNumber &&
				h.timestamp === entry.timestamp
		);

		if (index !== -1) {
			history.splice(index, 1);
			history = [...history];
		}

		hold.completed = false;
		hold.timestamp = null;
		currentSession = [...currentSession];

		await syncHistory();
	}

	function mergeInProgressSession(newSession: SessionStretch[]): SessionStretch[] {
		return newSession.map((stretch) => {
			const current = currentSession.find((s) => s.name === stretch.name);
			if (!current) return stretch;

			const holds = stretch.holds.map((hold) => {
				const currentHold = current.holds.find((h) => h.holdNumber === hold.holdNumber);
				if (!currentHold) return hold;

				if (!hold.completed && !currentHold.completed) {
					const durationSeconds = Number.isFinite(currentHold.durationSeconds)
						? currentHold.durationSeconds
						: hold.durationSeconds;
					return { ...hold, durationSeconds: durationSeconds || 0 };
				}

				return hold;
			});

			return { ...stretch, holds };
		});
	}

	$: todaysHistory = history.filter(
		(entry) => new Date(entry.timestamp).toDateString() === todayString()
	);

	$: totalHolds = currentSession.reduce((sum, stretch) => sum + stretch.holds.length, 0);
	$: completedHolds = currentSession.reduce(
		(sum, stretch) => sum + stretch.holds.filter((hold) => hold.completed).length,
		0
	);
	$: completionPercent = totalHolds === 0 ? 0 : Math.round((completedHolds / totalHolds) * 100);

	const calculateStreak = (entries: HistoryEntry[]) => {
		const timestamps = entries
			.map((entry) => new Date(entry.timestamp).getTime())
			.filter((ts) => !Number.isNaN(ts));
		if (timestamps.length === 0) return { count: 0, hasToday: false };

		const datesWithEntries = new Set(
			timestamps.map((ts) => new Date(ts).toDateString())
		);

		const latestTs = Math.max(...timestamps);
		const cursor = new Date(latestTs);
		let streak = 0;

		while (datesWithEntries.has(cursor.toDateString())) {
			streak += 1;
			cursor.setDate(cursor.getDate() - 1);
		}

		return { count: streak, hasToday: datesWithEntries.has(todayString()) };
	};

	$: streakInfo = calculateStreak(history);
	$: streakDays = streakInfo.count;
	$: streakHasToday = streakInfo.hasToday;
	$: holdLabelsMap = Object.fromEntries(data.stretchTemplate.map((stretch) => [stretch.name, stretch.holdLabels ?? []]));
	$: recurrenceLabels = Object.fromEntries(
		data.stretchTemplate.map((stretch) => [stretch.name, formatRecurrence(stretch.recurrence)])
	);

	const calculateMonthlyAccordance = (entries: HistoryEntry[]) => {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const daysSoFar = today.getDate();

		if (daysSoFar === 0) return 0;

		const datesWithEntries = new Set(
			entries
				.map((entry) => new Date(entry.timestamp))
				.filter((d) => d.getFullYear() === year && d.getMonth() === month)
				.map((d) => d.toDateString())
		);

		return Math.round((datesWithEntries.size / daysSoFar) * 100);
	};

	$: monthlyAccordance = calculateMonthlyAccordance(history);

	function formatRecurrence(recurrence: StretchTemplate['recurrence']): string {
		if (!recurrence || recurrence.frequency === 'daily') return 'Daily';

		if (recurrence.frequency === 'weekly') {
			if (recurrence.days && recurrence.days.length) {
				return `Weekly (${recurrence.days.join(', ')})`;
			}
			return 'Weekly';
		}

		if (recurrence.frequency === 'monthly') {
			if (recurrence.day_of_month) {
				return `Monthly (${recurrence.day_of_month}.)`;
			}
			return 'Monthly';
		}

		if (recurrence.frequency === 'yearly') {
			const hasMonth = Number.isInteger(recurrence.month);
			const hasDay = Number.isInteger(recurrence.day);
			if (hasMonth && hasDay) {
				const day = String(recurrence.day).padStart(2, '0');
				const month = String(recurrence.month).padStart(2, '0');
				return `Yearly (${day}.${month}.)`;
			}
			return 'Yearly';
		}

		return 'Recurring';
	}

	async function startTemplateWatcher() {
		const watcher = setInterval(async () => {
			try {
				const res = await fetch('/api/stretch-template-version', { cache: 'no-store' });
				if (!res.ok) return;
				const { version } = (await res.json()) as { version?: number };
				if (typeof version === 'number' && version !== templateVersion) {
					templateVersion = version;
					await invalidateAll();
				}
			} catch (error) {
				console.error('Template watch failed', error);
			}
		}, 2000);

		onDestroy(() => clearInterval(watcher));
	}
</script>

<svelte:head>
	<title>Action Logger</title>
</svelte:head>

<div class="page">
	<nav class="navbar">
		<h1>📋 Todo Logger</h1>
			<div class="badges">
				<div class={`summary-pill streak ${streakHasToday ? 'on' : 'off'}`} aria-live="polite">
					<span class="pill-icon">{streakHasToday ? '🔥' : '🕯️'}</span>
					<span>{streakDays} day{streakDays === 1 ? '' : 's'} streak</span>
				</div>
				<div class="summary-pill" aria-live="polite">
					<span class="pill-icon">🎯</span>
					<span>{monthlyAccordance}% month</span>
				</div>
			</div>
		</nav>

	{#if !ready}
		<div class="content">
			<p class="loading">Loading your todos...</p>
		</div>
	{:else}
		<div class="content">
			{#if loadError}
				<div class="alert">{loadError}</div>
			{/if}
			<section class="summary">
				<div class="summary-card">
					<div class="summary-label">Today</div>
					<div class="summary-value">{completionPercent}%</div>
					<div class="summary-sub">
						{completedHolds} / {totalHolds} todos
					</div>
				</div>
				<div class="summary-card">
			<div class="summary-label">Streak</div>
			<div class="summary-value">{streakDays}</div>
			<div class="summary-sub">
				{streakHasToday ? 'On fire' : 'Finish today to keep it lit'}
			</div>
		</div>
				<div class="summary-card">
					<div class="summary-label">Monthly Accordance</div>
					<div class="summary-value">{monthlyAccordance}%</div>
					<div class="summary-sub">This month so far</div>
				</div>
			</section>
			{#if oneOffs.length}
				<section class="oneoff-section">
					<h2>Today's one-offs</h2>
					<div class="oneoff-grid">
						{#each oneOffs as task}
							<div class="oneoff-card">
								<div class="oneoff-header">
									<div class="pill type">{task.type}</div>
									{#if task.priority !== undefined}
										<div class="pill priority">P{task.priority}</div>
									{/if}
								</div>
								<div class="oneoff-title">{task.title}</div>
								<div class="oneoff-meta">
									<div class="pill muted">{task.pipeline}</div>
									<div class="pill muted">{task.pillar}</div>
									{#if task.time_block}
										<div class="pill time">{task.time_block}</div>
									{/if}
								</div>
								{#if task.notes}
									<p class="oneoff-notes">{task.notes}</p>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}
			{#each currentSession as stretch, stretchIdx}
				<StretchCard
					{stretch}
					{stretchIdx}
					recurrenceLabel={recurrenceLabels[stretch.name] ?? 'Recurring'}
					pillarLabel={stretch.pillar}
					pillarEmoji={stretch.pillarEmoji}
					onLogHold={handleHoldAction}
					onUndoHold={undoHold}
				/>
			{/each}

			<HistoryList entries={todaysHistory} {holdLabelsMap} />
		</div>
	{/if}

</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background: linear-gradient(180deg, #f8fbff 0%, #f4f7fb 40%, #eef2f7 100%);
		padding-bottom: 120px;
		color: #0f172a;
	}

	.page {
		min-height: 100vh;
	}

	.navbar {
		background: #ffffff;
		color: #0f172a;
		padding: 14px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
		border-bottom: 1px solid #e2e8f0;
	}

	.navbar h1 {
		font-size: 19px;
		font-weight: 700;
	}

	.badges {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.summary-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #fff7ed;
		color: #9a3412;
		border: 1px solid #fed7aa;
		padding: 8px 12px;
		border-radius: 999px;
		font-weight: 700;
		font-size: 13px;
	}

	.summary-pill.streak.off {
		background: #f8fafc;
		color: #475569;
		border-color: #e2e8f0;
	}

	.summary-pill.streak.on {
		background: #fff7ed;
		color: #9a3412;
		border-color: #fed7aa;
	}

	.pill-icon {
		font-size: 16px;
	}

	.content {
		padding: 16px 12px;
		max-width: 720px;
		margin: 0 auto;
	}

	.loading {
		color: #666;
		text-align: center;
	}

	.alert {
		background: #fff4e5;
		color: #9c4a00;
		border: 1px solid #ffd7a8;
		border-radius: 8px;
		padding: 10px 12px;
		margin-bottom: 12px;
		font-size: 14px;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
		margin: 10px 0 14px;
	}

	.summary-card {
		background: white;
		border-radius: 12px;
		padding: 14px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		border: 1px solid #eef1f6;
	}

	.summary-label {
		font-size: 12px;
		font-weight: 700;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 6px;
	}

	.summary-value {
		font-size: 28px;
		font-weight: 800;
		color: #0f172a;
	}

	.summary-sub {
		margin-top: 4px;
		color: #6b7280;
		font-size: 13px;
	}

	.oneoff-section {
		margin-bottom: 18px;
	}

	.oneoff-section h2 {
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
		margin: 10px 0 8px;
	}

	.oneoff-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
		gap: 10px;
	}

	.oneoff-card {
		background: white;
		border: 1px solid #eef1f6;
		border-radius: 10px;
		padding: 12px 12px 10px;
		box-shadow: 0 1px 5px rgba(0, 0, 0, 0.06);
		display: grid;
		gap: 6px;
	}

	.oneoff-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.oneoff-title {
		font-size: 15px;
		font-weight: 700;
		color: #111827;
	}

	.oneoff-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.oneoff-notes {
		font-size: 13px;
		color: #4b5563;
		line-height: 1.4;
		margin-top: 2px;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border-radius: 999px;
		padding: 5px 9px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		background: #f1f5f9;
		color: #0f172a;
		border: 1px solid #e2e8f0;
	}

	.pill.type {
		background: #eff6ff;
		border-color: #dbeafe;
		color: #1d4ed8;
	}

	.pill.priority {
		background: #fef3c7;
		border-color: #fde68a;
		color: #92400e;
	}

	.pill.time {
		background: #ecfeff;
		border-color: #cffafe;
		color: #0e7490;
		text-transform: none;
		font-weight: 600;
	}

	.pill.muted {
		color: #475569;
		font-weight: 600;
	}

	@media (max-width: 540px) {
		.navbar h1 {
			font-size: 17px;
		}

		.content {
			padding: 14px 10px;
		}

		.badges {
			gap: 8px;
		}

		.summary-pill {
			padding: 7px 10px;
			font-size: 12px;
		}

		.summary {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}
	}
</style>
