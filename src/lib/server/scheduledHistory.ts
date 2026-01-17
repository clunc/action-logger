import { now } from '$lib/date';
import { isRecurrenceActiveOnDate } from '$lib/recurrence';
import type { HistoryEntry, TaskTemplate } from '$lib/types';
import { appendHistory, readHistory, replaceHistory } from '$lib/server/historyStore';
import { listOneOffs } from '$lib/server/oneOffStore';
import { listRecurringTasks } from '$lib/server/recurringStore';
import { loadTaskTemplate } from '$lib/server/taskConfig';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'task';

const occurrenceFor = (entry: HistoryEntry) => entry.occurrenceDate ?? entry.timestamp.slice(0, 10);
const matchesSubtask = (entry: HistoryEntry, taskId: string | undefined, taskName: string, subtaskNumber: number) =>
	(taskId ? entry.taskId === taskId : entry.task === taskName) && entry.subtaskNumber === subtaskNumber;

const hasNonScheduledOnDate = (
	targetDate: string,
	taskId: string | undefined,
	taskName: string,
	subtaskNumber: number,
	list: HistoryEntry[]
) =>
	list.some(
		(h) =>
			matchesSubtask(h, taskId, taskName, subtaskNumber) &&
			occurrenceFor(h) === targetDate &&
			h.status !== 'scheduled'
	);

const pickIds = (tasks: TaskTemplate[]) => {
	const idSet = new Set<string>();
	const pickId = (item: TaskTemplate, idx: number) => {
		const base = (item.id ?? slugify(item.name)) || `task-${idx + 1}`;
		let candidate = base;
		let counter = 2;
		while (idSet.has(candidate)) {
			candidate = `${base}-${counter++}`;
		}
		idSet.add(candidate);
		return candidate;
	};

	return tasks.map((item, idx) => ({ ...item, id: pickId(item, idx) }));
};

export const getDueTasksForDate = async (targetDate: Date) => {
	const todayIso = targetDate.toISOString().slice(0, 10);
	const [template, recurring, oneOffs] = await Promise.all([
		loadTaskTemplate().then((r) => r.template),
		listRecurringTasks(),
		listOneOffs()
	]);

	const includeToday = (item: TaskTemplate) => {
		if (item.isOneOff) {
			if (!item.dueDate) return false;
			return item.dueDate <= todayIso;
		}
		return isRecurrenceActiveOnDate(item.recurrence, targetDate);
	};

	const recurringTemplates: TaskTemplate[] = recurring.map((item) => ({
		id: `recurring-${item.id}`,
		name: item.title,
		defaultDurationSeconds: 0,
		subtaskLabels: [''],
		pipeline: item.pipeline,
		pillar: item.pillar,
		priority: item.priority,
		recurrence: item.recurrence,
		type: item.type,
		time_block: item.time_block,
		context: item.context,
		notes: item.notes
	}));

	const oneOffTemplates: TaskTemplate[] = oneOffs.map((task) => ({
		id: `oneoff-${task.id}`,
		name: task.title,
		defaultDurationSeconds: 0,
		subtaskLabels: [''],
		pillar: task.pillar,
		priority: task.priority,
		recurrence: { frequency: 'daily' as const },
		isOneOff: true,
		oneOffId: task.id,
		dueDate: task.scheduled_for
	}));

	const todayOnly = [...template, ...recurringTemplates, ...oneOffTemplates].filter(includeToday);
	return pickIds(todayOnly);
};

export async function seedScheduledHistory(options?: {
	targetDate?: Date;
	history?: HistoryEntry[];
	tasks?: TaskTemplate[];
}): Promise<HistoryEntry[]> {
	const target = options?.targetDate ?? now();
	const targetIso = target.toISOString().slice(0, 10);
	const history = options?.history ?? (await readHistory());
	const tasks = options?.tasks ?? (await getDueTasksForDate(target));

	let reconciled = [...history];

	// Ensure scheduled rows exist for every due subtask for the target date.
	for (const task of tasks) {
		const totalSubtasks = Math.max(1, task.subtaskLabels?.length ?? 1);
		for (let i = 1; i <= totalSubtasks; i++) {
			const already = reconciled.some(
				(h) => matchesSubtask(h, task.id, task.name, i) && occurrenceFor(h) === targetIso
			);
			if (!already) {
				reconciled = [
					{
						taskId: task.id,
						task: task.name,
						subtaskNumber: i,
						durationSeconds: 0,
						timestamp: `${targetIso}T00:00:00.000Z`,
						status: 'scheduled',
						occurrenceDate: targetIso
					},
					...reconciled
				];
			}
		}
	}

	// Drop scheduled rows where a real status exists for the same day/subtask.
	reconciled = reconciled.filter(
		(entry) =>
			entry.status !== 'scheduled' ||
			!hasNonScheduledOnDate(
				occurrenceFor(entry),
				entry.taskId ?? undefined,
				entry.task,
				entry.subtaskNumber,
				reconciled
			)
	);

	if (reconciled.length !== history.length || JSON.stringify(reconciled) !== JSON.stringify(history)) {
		await replaceHistory(reconciled);
		return reconciled;
	}

	return history;
}

let seedingStarted = false;

export function startScheduledSeeding() {
	if (seedingStarted) return;
	seedingStarted = true;

	const scheduleNext = (run: () => void) => {
		const next = new Date();
		next.setHours(0, 5, 0, 0); // 00:05 local time
		if (next <= new Date()) {
			next.setDate(next.getDate() + 1);
		}
		const delay = next.getTime() - Date.now();
		setTimeout(() => {
			run();
			scheduleNext(run);
		}, delay);
	};

	const run = () => {
		seedScheduledHistory().catch((error) => console.error('scheduled seeding failed', error));
	};

	// Run once on boot, then schedule daily.
	run();
	scheduleNext(run);
}
