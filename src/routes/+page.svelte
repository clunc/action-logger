<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import HistoryList from '$lib/components/HistoryList.svelte';
	import { appendHistory, deleteHistoryEntry, fetchHistory } from '$lib/api/history';
	import { createOneOffClient, deleteOneOffClient } from '$lib/api/oneOffs';
	import { createRecurringClient } from '$lib/api/recurring';
	import { createSession, todayString } from '$lib/tasks';
	import type { HistoryEntry, SessionTask, TaskTemplate, OneOffTask, RecurringTask } from '$lib/types';
	import { isOverdueOneOff, isOverdueRecurring } from '$lib/overdue';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;

	let history: HistoryEntry[] = [];
	let currentSession: SessionTask[] = [];
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let ready = false;
	let loadError = '';
	let templateVersion = data.templateVersion;
	let oneOffs: OneOffTask[] = data.oneOffs ?? [];
	let recurringTasks: RecurringTask[] = data.recurringTasks ?? [];
	let baseTemplates: TaskTemplate[] = [...data.taskTemplate];
	const serverPillarEmojiMap = Object.fromEntries(
		Object.entries((data as any).pillarEmojiMap ?? {}).map(([k, v]) => [k.toLowerCase(), v as string])
	);
	let pillarEmojiMap: Record<string, string> = { ...serverPillarEmojiMap };
	$: baseTemplates = data.taskTemplate.map(withPillarMeta);
	let createError = '';
	let creating = false;
	let newOneOff = {
		title: '',
		type: 'operational' as OneOffTask['type'],
		pipeline: '',
		pillar: '',
		time_block: '',
		priority: '',
		notes: ''
	};
	let showOneOffModal = false;
	let pipelineSelect = '';
	let pillarSelect = '';
	let pipelineCustom = '';
	let pillarCustom = '';
	let newOneOffKind: 'one-off' | 'recurring' = 'one-off';
	let recurrenceFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';
	let recurrenceWeeklyDays: string[] = [];
	let recurrenceMonthlyDay = '';
	let recurrenceYearMonth = '';
	let recurrenceYearDay = '';
	let oneOffDueDate = '';
	let showDeleteModal = false;
	let deleteTargetId: number | null = null;
	let deleteTargetName = '';
	let allTemplates: TaskTemplate[] = [];
	const normalizePillarKey = (value: string | undefined | null) =>
		(value ?? '').toLowerCase().replace(/\s+/g, '_');
	const formatPillarLabel = (value: string | undefined | null) => {
		if (!value) return value ?? '';
		return value
			.split(/[\s_]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	};
	const withPillarMeta = (task: TaskTemplate): TaskTemplate => {
		const label = task.pillar ? formatPillarLabel(task.pillar) : task.pillar;
		const key = task.pillar ? normalizePillarKey(task.pillar) : '';
		const emoji = task.pillar ? pillarEmojiMap[key] ?? task.pillarEmoji : task.pillarEmoji;
		return { ...task, pillar: label, pillarEmoji: emoji };
	};
	const isOverdueTemplate = (
		task: TaskTemplate | SessionTask,
		hist: HistoryEntry[] = history,
		isReady = ready
	) => {
		if (task.isOneOff) {
			return isOverdueOneOff(task.dueDate);
		}
		if (!task.recurrence) return false;
		if (!isReady) return false;
		return isOverdueRecurring({
			recurrence: task.recurrence,
			history: hist,
			taskId: task.id,
			taskName: task.name
		});
	};
	const recurringToTemplate = (task: RecurringTask): TaskTemplate => ({
		id: `recurring-${task.id}`,
		name: task.title,
		defaultDurationSeconds: 0,
		subtaskLabels: [''],
		pipeline: task.pipeline,
		...withPillarMeta({ ...task, pillar: task.pillar }),
		priority: task.priority,
		recurrence: task.recurrence,
		type: task.type,
		time_block: task.time_block,
		context: task.context,
		notes: task.notes
	});
	const templateKey = (task: { id?: string; name: string }) => task.id ?? task.name;
	$: {
		if (pipelineSelect && pipelineSelect !== '__custom') {
			newOneOff.pipeline = pipelineSelect;
		} else if (pipelineSelect !== '__custom') {
			newOneOff.pipeline = '';
		}

		if (pillarSelect && pillarSelect !== '__custom') {
			newOneOff.pillar = pillarSelect;
		} else if (pillarSelect !== '__custom') {
			newOneOff.pillar = '';
		}
	}

	$: {
		if (pipelineSelect && pipelineSelect !== '__custom') {
			newOneOff.pipeline = pipelineSelect;
		} else if (pipelineSelect !== '__custom') {
			newOneOff.pipeline = '';
		}

		if (pillarSelect && pillarSelect !== '__custom') {
			newOneOff.pillar = pillarSelect;
		} else if (pillarSelect !== '__custom') {
			newOneOff.pillar = '';
		}
	}

	onMount(async () => {
		try {
			history = await fetchHistory();
		} catch (error) {
			console.error(error);
			loadError = 'Could not load history. Changes will not be saved.';
		} finally {
			currentSession = createSession(allTemplates, history);
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
			currentSession = mergeInProgressSession(createSession(allTemplates, history));
		} catch (error) {
			console.error('Failed to refresh history', error);
			loadError = 'Could not refresh history from server.';
		}
	}

	async function handleSubtaskAction(taskIdx: number, subtaskIdx: number, status: 'done' | 'skipped' = 'done') {
		await startSubtaskAndLog(taskIdx, subtaskIdx, status);
	}

	async function startSubtaskAndLog(taskIdx: number, subtaskIdx: number, status: 'done' | 'skipped') {
		const task = currentSession[taskIdx];
		const subtask = task.subtasks[subtaskIdx];
		if (subtask.completed) return;

		const timestamp = new Date().toISOString();
		const durationSeconds = 0;

		const prevHistory = [...history];
		const prevTaskState = JSON.stringify(currentSession);

		subtask.completed = status === 'done';
		subtask.timestamp = timestamp;
		subtask.durationSeconds = durationSeconds;
		subtask.status = status;

		const entry: HistoryEntry = {
			taskId: task.id,
			task: task.name,
			subtaskNumber: subtask.subtaskNumber,
			durationSeconds,
			timestamp,
			status,
			occurrenceDate: task.dueDate ?? timestamp.slice(0, 10)
		};

		history = [entry, ...history];
		currentSession = [...currentSession];

		if (!loadError) {
			try {
				await appendHistory([entry]);
				await syncHistory();
			} catch (error) {
				console.error(error);
				loadError = 'Could not save action; reverted.';
				history = prevHistory;
				currentSession = JSON.parse(prevTaskState);
			}
		}

		// Timers removed; mark complete instantly.
	}

	async function undoSubtask(taskIdx: number, subtaskIdx: number) {
		const task = currentSession[taskIdx];
		const subtask = task.subtasks[subtaskIdx];
		if (!subtask.timestamp) return;

		const prevHistory = [...history];
		const prevTaskState = JSON.stringify(currentSession);

		const allowNameFallback = currentSession.filter((t) => t.name === task.name).length === 1;
		const matchingHistory = history.find(
			(h) =>
				h.subtaskNumber === subtask.subtaskNumber &&
				h.timestamp === subtask.timestamp &&
				((task.id && h.taskId === task.id) ||
					(!task.id && h.task === task.name) ||
					(allowNameFallback && h.task === task.name))
		);
		const entryTaskId = matchingHistory?.taskId ?? task.id;

		const entry = {
			taskId: entryTaskId ?? undefined,
			task: task.name,
			subtaskNumber: subtask.subtaskNumber,
			timestamp: subtask.timestamp
		};

		try {
			await deleteHistoryEntry(entry);
			loadError = '';
		} catch (error) {
			console.error(error);
			loadError = 'Could not undo action; reverted.';
			history = prevHistory;
			currentSession = JSON.parse(prevTaskState);
			return;
		}

		const index = history.findIndex(
				(h) =>
					h.subtaskNumber === entry.subtaskNumber &&
					h.timestamp === entry.timestamp &&
					((entry.taskId && h.taskId === entry.taskId) ||
						(!entry.taskId && h.taskId == null && h.task === entry.task) ||
						(allowNameFallback && h.task === entry.task))
		);

		if (index !== -1) {
			history.splice(index, 1);
			history = [...history];
		}

		subtask.completed = false;
		subtask.timestamp = null;
		subtask.status = 'pending';
		currentSession = [...currentSession];

		await syncHistory();
	}

	function mergeInProgressSession(newSession: SessionTask[]): SessionTask[] {
		const nameCounts = newSession.reduce((acc, task) => {
			acc[task.name] = (acc[task.name] ?? 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return newSession.map((task) => {
			const allowNameFallback = (nameCounts[task.name] ?? 1) === 1;
			const current = currentSession.find(
				(s) => (task.id && s.id === task.id) || (allowNameFallback && s.name === task.name)
			);
			if (!current) return task;

			const subtasks = task.subtasks.map((subtask) => {
				const currentSubtask = current.subtasks.find((h) => h.subtaskNumber === subtask.subtaskNumber);
				if (!currentSubtask) return subtask;

				if (!subtask.completed && !currentSubtask.completed) {
					const durationSeconds = Number.isFinite(currentSubtask.durationSeconds)
						? currentSubtask.durationSeconds
						: subtask.durationSeconds;
					return { ...subtask, durationSeconds: durationSeconds || 0 };
				}

				return subtask;
			});

			return { ...task, subtasks };
		});
	}

	$: todaysHistory = history.filter(
		(entry) => new Date(entry.timestamp).toDateString() === todayString()
	);

	$: totalSubtasks = currentSession.reduce((sum, task) => sum + task.subtasks.length, 0);
	$: completedSubtasks = currentSession.reduce(
		(sum, task) => sum + task.subtasks.filter((subtask) => subtask.completed).length,
		0
	);
	$: completionPercent = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

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
	$: pillarEmojiMap = {
		...serverPillarEmojiMap,
		...Object.fromEntries(
			baseTemplates
				.filter((task) => task.pillar && task.pillarEmoji)
				.map((task) => [normalizePillarKey(task.pillar), task.pillarEmoji as string])
		)
	};
	$: oneOffTemplates = oneOffs.map<TaskTemplate>((task) =>
		withPillarMeta({
			id: `oneoff-${task.id}`,
			name: task.title,
			defaultDurationSeconds: 0,
			subtaskLabels: [''],
			pillar: task.pillar,
			pillarEmoji: task.pillar ? pillarEmojiMap[normalizePillarKey(task.pillar)] : undefined,
			priority: task.priority,
			recurrence: { frequency: 'daily' as const },
			isOneOff: true,
			oneOffId: task.id,
			dueDate: task.scheduled_for
		})
	);
	const sortTemplates = (
		items: TaskTemplate[],
		hist: HistoryEntry[] = history,
		isReady = ready
	) => {
		const priorityValue = (task: TaskTemplate) =>
			Number.isFinite(task.priority) ? (task.priority as number) : -Infinity;
		return [...items].sort((a, b) => {
			const aOverdue = isOverdueTemplate(a, hist, isReady);
			const bOverdue = isOverdueTemplate(b, hist, isReady);
			if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
			const aPri = priorityValue(a);
			const bPri = priorityValue(b);
			if (aPri !== bPri) return bPri - aPri;
			if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
				return a.dueDate.localeCompare(b.dueDate);
			}
			return (a.name || '').localeCompare(b.name || '');
		});
	};
	$: allTemplates = sortTemplates([...baseTemplates, ...oneOffTemplates], history, ready);
	$: oneOffRecurrenceLabels = Object.fromEntries(
		oneOffs.map((task) => {
			const key = `oneoff-${task.id}`;
			if (!task.scheduled_for) return [key, 'One-off'];
			const todayIso = new Date().toISOString().slice(0, 10);
			const isToday = task.scheduled_for === todayIso;
			return [key, isToday ? 'One-off (today)' : `One-off (due ${task.scheduled_for})`];
		})
	);
	$: subtaskLabelsMap = allTemplates.reduce((acc, task) => {
		const labels = task.subtaskLabels ?? [];
		const key = templateKey(task);
		acc[key] = labels;
		if (!task.id) {
			acc[task.name] = labels;
		}
		return acc;
	}, {} as Record<string, string[] | undefined>);
	const shouldShowSkip = (task: TaskTemplate | SessionTask) => isOverdueTemplate(task, history, ready);
	$: recurrenceLabels = allTemplates.reduce((acc, task) => {
		const key = templateKey(task);
		acc[key] = oneOffRecurrenceLabels[key] ?? formatRecurrence(task.recurrence);
		if (!task.id) {
			acc[task.name] = acc[key];
		}
		return acc;
	}, {} as Record<string, string>);
	$: pipelineOptions = Array.from(
		new Set(
			[
				...baseTemplates.map((t) => t.pipeline).filter(Boolean),
				...oneOffs.map((o) => o.pipeline).filter(Boolean)
			] as string[]
		)
	);
	$: pillarOptions = Array.from(
		new Set(
			[
				...baseTemplates.map((t) => t.pillar).filter(Boolean),
				...oneOffs.map((o) => o.pillar).filter(Boolean)
			] as string[]
		)
	);
	$: if (ready) {
		currentSession = mergeInProgressSession(createSession(allTemplates, history));
	}

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

	function validateOneOff() {
		const trimmedTitle = newOneOff.title.trim();
		const pipelineValue = pipelineSelect === '__custom' ? pipelineCustom.trim() : newOneOff.pipeline.trim();
		const pillarValue = pillarSelect === '__custom' ? pillarCustom.trim() : newOneOff.pillar.trim();
		if (!trimmedTitle) return 'Title is required';
		if (!pipelineValue) return 'Pipeline is required';
		if (!pillarValue) return 'Pillar is required';
		if (newOneOffKind === 'one-off') {
			if (!oneOffDueDate) return 'Due date is required for one-off';
		}
		if (newOneOffKind === 'recurring') {
			if (recurrenceFrequency === 'weekly' && !recurrenceWeeklyDays.length) return 'Select at least one weekday';
			if (recurrenceFrequency === 'monthly') {
				const day = Number(recurrenceMonthlyDay);
				if (!Number.isInteger(day) || day < 1 || day > 31) return 'Monthly day must be 1-31';
			}
			if (recurrenceFrequency === 'yearly') {
				const month = Number(recurrenceYearMonth);
				const day = Number(recurrenceYearDay);
				if (!Number.isInteger(month) || month < 1 || month > 12) return 'Yearly month must be 1-12';
				if (!Number.isInteger(day) || day < 1 || day > 31) return 'Yearly day must be 1-31';
			}
		}
		return '';
	}

	async function submitOneOff(event: Event) {
		event.preventDefault();
		createError = '';
		const errorMsg = validateOneOff();
		if (errorMsg) {
			createError = errorMsg;
			return;
		}
		creating = true;
		try {
			const priorityNum = newOneOff.priority === '' ? undefined : Number(newOneOff.priority);
			const pipelineValue = pipelineSelect === '__custom' ? pipelineCustom.trim() : newOneOff.pipeline.trim();
			const pillarValue = pillarSelect === '__custom' ? pillarCustom.trim() : newOneOff.pillar.trim();
			const payload: any = {
				title: newOneOff.title.trim(),
				type: newOneOff.type,
				pipeline: pipelineValue,
				pillar: pillarValue,
				time_block: newOneOff.time_block.trim() || undefined,
				priority: Number.isFinite(priorityNum) ? Math.round(priorityNum as number) : undefined,
				notes: newOneOff.notes.trim() || undefined
			};

			if (newOneOffKind === 'recurring') {
				if (recurrenceFrequency === 'weekly') {
					payload.recurrence = { frequency: 'weekly', days: recurrenceWeeklyDays };
				} else if (recurrenceFrequency === 'monthly') {
					const day = Number(recurrenceMonthlyDay);
					payload.recurrence = { frequency: 'monthly', day_of_month: day };
				} else if (recurrenceFrequency === 'yearly') {
					const month = Number(recurrenceYearMonth);
					const day = Number(recurrenceYearDay);
					payload.recurrence = { frequency: 'yearly', month, day };
				} else {
					payload.recurrence = { frequency: 'daily' };
				}
			} else {
				payload.scheduled_for = oneOffDueDate;
			}

			if (newOneOffKind === 'recurring') {
				const createdRecurring = await createRecurringClient(payload);
				recurringTasks = [createdRecurring, ...recurringTasks];
				baseTemplates = [recurringToTemplate(createdRecurring), ...baseTemplates];
			} else {
				const created = await createOneOffClient(payload);
				oneOffs = [created, ...oneOffs];
			}

			currentSession = mergeInProgressSession(createSession(allTemplates, history));
			newOneOff = {
				title: '',
				type: 'operational',
				pipeline: '',
				pillar: '',
				time_block: '',
				priority: '',
				notes: ''
			};
			pipelineSelect = '';
			pillarSelect = '';
			pipelineCustom = '';
			pillarCustom = '';
			recurrenceFrequency = 'daily';
			recurrenceWeeklyDays = [];
			recurrenceMonthlyDay = '';
			recurrenceYearMonth = '';
			recurrenceYearDay = '';
			oneOffDueDate = '';
			showOneOffModal = false;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Failed to create action';
			createError = message;
		} finally {
			creating = false;
		}
	}

	function openOneOffModal() {
		createError = '';
		showOneOffModal = true;
	}

	function closeOneOffModal() {
		if (creating) return;
		showOneOffModal = false;
	}

	function openDeleteModal(oneOffId: number, name: string) {
		deleteTargetId = oneOffId;
		deleteTargetName = name;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteTargetId = null;
		deleteTargetName = '';
	}

	async function confirmDeleteModal() {
		if (!deleteTargetId) return;
		await deleteOneOff(deleteTargetId, deleteTargetName);
		closeDeleteModal();
	}

	function handleBackdropKey(event: KeyboardEvent, onClose: () => void) {
		if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}

	async function deleteOneOff(oneOffId: number | undefined, taskName: string) {
		if (!oneOffId) return;
		const target = oneOffs.find((o) => o.id === oneOffId);
		if (!target) return;
		const prevOneOffs = [...oneOffs];
		const prevSession = JSON.stringify(currentSession);
		const updatedOneOffs = oneOffs.filter((o) => o.id !== oneOffId);
		const updatedTemplates = [
			...baseTemplates,
			...updatedOneOffs.map<TaskTemplate>((task) => ({
				id: `oneoff-${task.id}`,
				name: task.title,
				defaultDurationSeconds: 0,
				subtaskLabels: [''],
				pillar: task.pillar,
				pillarEmoji: task.pillar ? pillarEmojiMap[task.pillar.toLowerCase()] : undefined,
				priority: task.priority,
				recurrence: { frequency: 'daily' as const },
				isOneOff: true,
				oneOffId: task.id,
				dueDate: task.scheduled_for
			}))
		];

		oneOffs = updatedOneOffs;
		currentSession = createSession(updatedTemplates, history);
		try {
			await deleteOneOffClient(oneOffId);
		} catch (error) {
			console.error(error);
			loadError = 'Could not delete task; restored.';
			oneOffs = prevOneOffs;
			currentSession = JSON.parse(prevSession);
		}
	}

	function formatRecurrence(recurrence: TaskTemplate['recurrence']): string {
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
				const res = await fetch('/api/task-template-version', { cache: 'no-store' });
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
		<h1>📋 Action Logger</h1>
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
			<p class="loading">Loading your actions...</p>
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
						{completedSubtasks} / {totalSubtasks} actions
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
			<button class="oneoff-add-button" type="button" on:click={openOneOffModal}>
				<span class="add-icon">＋</span>
				<span class="add-title">Add task</span>
			</button>
			{#each currentSession as task, taskIdx}
			<TaskCard
				task={task}
				taskIdx={taskIdx}
				recurrenceLabel={recurrenceLabels[templateKey(task)] ?? 'Recurring'}
					isOneOff={Boolean(task.isOneOff)}
					overdue={shouldShowSkip(task)}
					pillarLabel={task.pillar}
					pillarEmoji={task.pillarEmoji}
					onLogSubtask={handleSubtaskAction}
					onUndoSubtask={undoSubtask}
					onSkipSubtask={(idx, subIdx) => handleSubtaskAction(idx, subIdx, 'skipped')}
					showSkip={shouldShowSkip(task)}
					onDelete={task.oneOffId ? () => openDeleteModal(task.oneOffId as number, task.name) : null}
				/>
			{/each}

			<HistoryList entries={todaysHistory} subtaskLabelsMap={subtaskLabelsMap} />
		</div>
	{/if}

	{#if showOneOffModal}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Close add task dialog"
			on:click={closeOneOffModal}
			on:keydown={(event) => handleBackdropKey(event, closeOneOffModal)}
		>
			<div
				class="modal-card"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				on:click|stopPropagation
				on:keydown|stopPropagation
			>
				<header class="modal-header">
					<h3>Add today’s one-off action</h3>
					<button class="icon-btn" type="button" on:click={closeOneOffModal} aria-label="Close dialog">
						✕
					</button>
				</header>
				<form on:submit|preventDefault={submitOneOff} class="oneoff-form">
					<div class="form-grid">
						<label>
							<span>Title *</span>
							<input type="text" bind:value={newOneOff.title} placeholder="Action title" required />
						</label>
						<label>
							<span>Pipeline *</span>
							<select bind:value={pipelineSelect}>
								<option value="">Select pipeline</option>
								{#each pipelineOptions as option}
									<option value={option}>{option}</option>
								{/each}
								<option value="__custom">Custom…</option>
							</select>
						</label>
						<label>
							<span>Pillar *</span>
							<select bind:value={pillarSelect}>
								<option value="">Select pillar</option>
								{#each pillarOptions as option}
									<option value={option}>{option}</option>
								{/each}
								<option value="__custom">Custom…</option>
							</select>
						</label>
						<label>
							<span>Type</span>
							<select bind:value={newOneOff.type}>
								<option value="operational">Operational</option>
								<option value="retrospective">Retrospective</option>
								<option value="strategic">Strategic</option>
							</select>
						</label>
						<label>
							<span>Priority</span>
							<input
								type="number"
								min="0"
								inputmode="numeric"
								bind:value={newOneOff.priority}
								placeholder="Optional"
							/>
						</label>
						<label>
							<span>Time block</span>
							<input type="text" bind:value={newOneOff.time_block} placeholder="e.g., 14:00–14:30" />
						</label>
					</div>
					<label>
						<span>Kind</span>
						<select bind:value={newOneOffKind}>
							<option value="one-off">One-off (today)</option>
							<option value="recurring">Recurring</option>
						</select>
					</label>
					{#if newOneOffKind === 'one-off'}
						<label>
							<span>Due date *</span>
							<input type="date" bind:value={oneOffDueDate} />
						</label>
					{:else}
						<label>
							<span>Recurrence</span>
							<select bind:value={recurrenceFrequency}>
								<option value="daily">Daily</option>
								<option value="weekly">Weekly</option>
								<option value="monthly">Monthly</option>
								<option value="yearly">Yearly</option>
							</select>
						</label>
						{#if recurrenceFrequency === 'weekly'}
							<div class="chip-row">
								{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
									<button
										type="button"
										class={`chip ${recurrenceWeeklyDays.includes(day) ? 'on' : ''}`}
										on:click={() => {
											recurrenceWeeklyDays = recurrenceWeeklyDays.includes(day)
												? recurrenceWeeklyDays.filter((d) => d !== day)
												: [...recurrenceWeeklyDays, day];
										}}
									>
										{day}
									</button>
								{/each}
							</div>
						{:else if recurrenceFrequency === 'monthly'}
							<label>
								<span>Day of month</span>
								<input
									type="number"
									min="1"
									max="31"
									bind:value={recurrenceMonthlyDay}
									placeholder="1-31"
								/>
							</label>
						{:else if recurrenceFrequency === 'yearly'}
							<div class="form-grid">
								<label>
									<span>Month</span>
									<input
										type="number"
										min="1"
										max="12"
										bind:value={recurrenceYearMonth}
										placeholder="1-12"
									/>
								</label>
								<label>
									<span>Day</span>
									<input
										type="number"
										min="1"
										max="31"
										bind:value={recurrenceYearDay}
										placeholder="1-31"
									/>
								</label>
							</div>
						{/if}
					{/if}
					{#if pipelineSelect === '__custom' || pillarSelect === '__custom'}
						<div class="form-grid">
							{#if pipelineSelect === '__custom'}
								<label>
									<span>Custom pipeline *</span>
									<input
										type="text"
										bind:value={pipelineCustom}
										placeholder="e.g., ops, personal, health"
										required
									/>
								</label>
							{/if}
							{#if pillarSelect === '__custom'}
								<label>
									<span>Custom pillar *</span>
									<input
										type="text"
										bind:value={pillarCustom}
										placeholder="e.g., career, health"
										required
									/>
								</label>
							{/if}
						</div>
					{/if}
					<label class="full-row">
						<span>Notes</span>
						<textarea rows="2" bind:value={newOneOff.notes} placeholder="Context or checklist"></textarea>
					</label>
					<div class="form-actions">
						{#if createError}
							<div class="form-error" role="alert">{createError}</div>
						{/if}
						<button class="primary-btn" type="submit" disabled={creating}>
							{creating ? 'Adding…' : 'Add action'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showDeleteModal}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Close delete dialog"
			on:click={closeDeleteModal}
			on:keydown={(event) => handleBackdropKey(event, closeDeleteModal)}
		>
			<div
				class="modal-card small"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				on:click|stopPropagation
				on:keydown|stopPropagation
			>
				<header class="modal-header">
					<h3>Delete one-off?</h3>
					<button class="icon-btn" type="button" on:click={closeDeleteModal} aria-label="Close dialog">
						✕
					</button>
				</header>
				<p class="confirm-text">Delete “{deleteTargetName}”? This cannot be undone.</p>
				<div class="form-actions space-between">
					<button class="ghost-btn" type="button" on:click={closeDeleteModal}>Cancel</button>
					<button class="danger-btn" type="button" on:click={confirmDeleteModal}>Delete</button>
				</div>
			</div>
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

	.oneoff-form-card {
		margin: 8px 0 16px;
		background: white;
		border: 1px solid #eef1f6;
		border-radius: 12px;
		padding: 14px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}

	.oneoff-form {
		display: grid;
		gap: 10px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 10px;
	}

	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
		color: #334155;
		font-weight: 700;
	}

	input,
	select,
	textarea {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
		font-size: 14px;
		font-family: inherit;
		background: #f8fafc;
		color: #0f172a;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: 2px solid #93c5fd;
		background: white;
	}

	textarea {
		resize: vertical;
	}

	.full-row {
		width: 100%;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		justify-content: flex-end;
	}

	.form-error {
		color: #b91c1c;
		background: #fef2f2;
		border: 1px solid #fecdd3;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 13px;
	}

	.primary-btn {
		border: none;
		background: #2563eb;
		color: white;
		padding: 10px 14px;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
		transition: transform 0.08s ease, box-shadow 0.12s ease, background 0.12s ease;
	}

	.primary-btn:hover {
		background: #1d4ed8;
	}

	.primary-btn:active {
		transform: translateY(1px);
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
	}

	.primary-btn:disabled {
		background: #cbd5e1;
		color: #475569;
		cursor: not-allowed;
		box-shadow: none;
	}

	.oneoff-add-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: linear-gradient(90deg, #2563eb, #1d4ed8);
		border: 1px solid #1d4ed8;
		color: white;
		border-radius: 999px;
		padding: 12px 16px;
		box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
		cursor: pointer;
		transition: transform 0.08s ease, box-shadow 0.12s ease, border-color 0.12s ease;
		margin: 8px 0 12px;
	}

	.oneoff-add-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 18px rgba(37, 99, 235, 0.4);
	}

	.oneoff-add-button:active {
		transform: translateY(1px);
		box-shadow: 0 3px 8px rgba(37, 99, 235, 0.35);
	}

	.oneoff-add-text {
		display: grid;
		gap: 4px;
		text-align: left;
	}

	.add-title {
		font-size: 15px;
		font-weight: 800;
	}

	.add-icon {
		font-size: 18px;
		font-weight: 800;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 14px;
	}

	.modal-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		padding: 14px 16px;
		max-width: 640px;
		width: 100%;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
	}

	.modal-card.small {
		max-width: 360px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}

	.modal-header h3 {
		font-size: 16px;
		font-weight: 800;
		color: #0f172a;
	}

	.icon-btn {
		border: none;
		background: transparent;
		font-size: 18px;
		cursor: pointer;
		color: #475569;
	}

	.icon-btn:hover {
		color: #0f172a;
	}

	.ghost-btn {
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #0f172a;
		padding: 9px 12px;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
	}

	.danger-btn {
		border: 1px solid #ef4444;
		background: #fee2e2;
		color: #b91c1c;
		padding: 9px 12px;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm-text {
		font-size: 14px;
		color: #0f172a;
		margin: 8px 0 14px;
	}

	.form-actions.space-between {
		justify-content: space-between;
	}

	.chip-row {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.chip {
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #0f172a;
		border-radius: 999px;
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.chip.on {
		background: #2563eb;
		color: white;
		border-color: #1d4ed8;
	}

	@media (max-width: 540px) {
		.oneoff-add-button {
			flex-direction: row;
			align-items: center;
		}
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
