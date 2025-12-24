import type { PageServerLoad } from './$types';
import { loadTaskTemplate } from '$lib/server/taskConfig';
import { listOneOffs } from '$lib/server/oneOffStore';
import { listRecurringTasks } from '$lib/server/recurringStore';
import type { OneOffTask, RecurringTask, TaskTemplate } from '$lib/types';
import { isRecurrenceActiveToday } from '$lib/recurrence';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'task';

export const load: PageServerLoad = async () => {
	try {
		const { template, version } = await loadTaskTemplate();
		const recurring = await listRecurringTasks();
		const oneOffs = await listOneOffs();
		const active = template.filter((item) => isRecurrenceActiveToday(item.recurrence));
		const inactive = template.filter((item) => !isRecurrenceActiveToday(item.recurrence));

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

		const combined = [...sortByPriority([...active, ...recurringTemplates]), ...sortByPriority(inactive)].map(
			(item, idx) => ({
				...item,
				id: pickId(item, idx)
			})
		);

		return {
			taskTemplate: combined,
			templateVersion: version,
			oneOffs: oneOffs as OneOffTask[],
			recurringTasks: recurring as RecurringTask[]
		};
	} catch (error) {
		console.error('Failed to load task template, using fallback', error);
		const fallback: TaskTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return {
			taskTemplate: fallback,
			templateVersion: Date.now(),
			oneOffs: [] as OneOffTask[],
			recurringTasks: [] as RecurringTask[]
		};
	}
};
