import type { PageServerLoad } from './$types';
import { loadPillarEmojiMap, loadTaskTemplate } from '$lib/server/taskConfig';
import { listOneOffs } from '$lib/server/oneOffStore';
import { listRecurringTasks } from '$lib/server/recurringStore';
import { createOneOff } from '$lib/server/oneOffStore';
import { createRecurringTask } from '$lib/server/recurringStore';
import { readHistory, replaceHistory, appendHistory } from '$lib/server/historyStore';
import type { OneOffTask, RecurringTask, TaskTemplate } from '$lib/types';
import { isRecurrenceActiveOnDate } from '$lib/recurrence';
import { isDevEnv } from '$lib/env';
import { seedScheduledHistory } from '$lib/server/scheduledHistory';
import { seededHistory, seededOneOffs, seededRecurring, seededTemplates } from '$lib/devSeed';
import { now, todayIsoString } from '$lib/date';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'task';

export const load: PageServerLoad = async () => {
	try {
		const today = now();
		const todayIso = todayIsoString();
		let { template, version } = await loadTaskTemplate();
		const { map: pillarEmojiMap } = await loadPillarEmojiMap();
		let recurring = await listRecurringTasks();
		let oneOffs = await listOneOffs();
		const active = template.filter((item) => isRecurrenceActiveOnDate(item.recurrence, today));
		const inactive = template.filter((item) => !isRecurrenceActiveOnDate(item.recurrence, today));

		const sortByPriority = (items: TaskTemplate[]) =>
			[...items].sort((a, b) => {
				const aPri = Number.isFinite(a.priority) ? (a.priority as number) : -Infinity;
				const bPri = Number.isFinite(b.priority) ? (b.priority as number) : -Infinity;
				if (aPri === bPri) return 0;
				return bPri - aPri;
		});

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

		const prioritize = (items: TaskTemplate[]) =>
			[...items].sort((a, b) => {
				const aOverdue = a.isOneOff && a.dueDate && a.dueDate < todayIso;
				const bOverdue = b.isOneOff && b.dueDate && b.dueDate < todayIso;
				if (aOverdue && !bOverdue) return -1;
				if (!aOverdue && bOverdue) return 1;
				const aPri = Number.isFinite(a.priority) ? (a.priority as number) : -Infinity;
				const bPri = Number.isFinite(b.priority) ? (b.priority as number) : -Infinity;
				if (aPri === bPri) return 0;
				return bPri - aPri;
			});

		const includeToday = (item: TaskTemplate) => {
			if (item.isOneOff) {
				if (!item.dueDate) return false;
				return item.dueDate <= todayIso; // show due today or overdue
			}
			return isRecurrenceActiveOnDate(item.recurrence, today);
		};

		const todayOnly = [...template, ...recurringTemplates].filter(includeToday);

		const combined = prioritize(todayOnly).map((item, idx) => ({
			...item,
			id: pickId(item, idx),
			dueDate: isRecurrenceActiveOnDate(item.recurrence, today) ? todayIso : item.dueDate
		}));

		// Cleanup: remove any auto-added skipped entries from earlier builds for today's date (midnight timestamps).
		let history = await readHistory();
		const cleanedHistory = history.filter((entry) => {
			if (entry.status !== 'skipped') return true;
			const ts = new Date(entry.timestamp);
			if (ts.toDateString() !== today.toDateString()) return true;
			// Assume auto-skips were created near midnight with zero duration; keep user-created skips later in the day.
			if (entry.durationSeconds === 0 && ts.getHours() < 2) {
				return false;
			}
			return true;
		});
		if (cleanedHistory.length !== history.length) {
			history = cleanedHistory;
			await replaceHistory(history);
		}

		history = await seedScheduledHistory({ targetDate: today, history, tasks: combined });

		// Dev seed to quickly test business logic without touching prod data.
		if (isDevEnv) {
			if (!template.length) {
				template = seededTemplates();
			}
			if (!recurring.length) {
				recurring = await Promise.all(seededRecurring().map((r) => createRecurringTask(r)));
			}
			if (!oneOffs.length) {
				oneOffs = await Promise.all(seededOneOffs(todayIso).map((o) => createOneOff(o)));
			}
			if (!history.length) {
				await appendHistory(seededHistory(todayIso));
			}
		}

		return {
			taskTemplate: combined,
			templateVersion: version,
			oneOffs: oneOffs as OneOffTask[],
			recurringTasks: recurring as RecurringTask[],
			pillarEmojiMap
		};
	} catch (error) {
		console.error('Failed to load task template, using fallback', error);
		const fallback: TaskTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return {
			taskTemplate: fallback,
			templateVersion: Date.now(),
			oneOffs: [] as OneOffTask[],
			recurringTasks: [] as RecurringTask[],
			pillarEmojiMap: {}
		};
	}
};
