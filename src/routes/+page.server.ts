import type { PageServerLoad } from './$types';
import { loadTaskTemplate } from '$lib/server/taskConfig';
import { listOneOffs } from '$lib/server/oneOffStore';
import { toDateString } from '$lib/date';
import type { OneOffTask, TaskTemplate } from '$lib/types';
import { isRecurrenceActiveToday } from '$lib/recurrence';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'task';

const uuid = () => crypto.randomUUID();

export const load: PageServerLoad = async () => {
	try {
		const { template, version } = await loadTaskTemplate();
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

		const combined = [...sortByPriority(active), ...sortByPriority(inactive)].map((item) => ({
			...item,
			id: item.id ?? uuid()
		}));

		return {
			taskTemplate: combined,
			templateVersion: version,
			oneOffs: oneOffs as OneOffTask[]
		};
	} catch (error) {
		console.error('Failed to load task template, using fallback', error);
		const fallback: TaskTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return {
			taskTemplate: fallback,
			templateVersion: Date.now(),
			oneOffs: [] as OneOffTask[]
		};
	}
};
