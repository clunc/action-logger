import type { PageServerLoad } from './$types';
import { loadStretchTemplate } from '$lib/server/stretchConfig';
import { listOneOffs } from '$lib/server/oneOffStore';
import { toDateString } from '$lib/date';
import type { OneOffTask, StretchTemplate } from '$lib/types';
import { isRecurrenceActiveToday } from '$lib/recurrence';

export const load: PageServerLoad = async () => {
	try {
		const { template, version } = await loadStretchTemplate();
		const today = toDateString(new Date());
		const oneOffs = await listOneOffs(today);
		const active = template.filter((item) => isRecurrenceActiveToday(item.recurrence));
		const inactive = template.filter((item) => !isRecurrenceActiveToday(item.recurrence));

		const sortByPriority = (items: StretchTemplate[]) =>
			[...items].sort((a, b) => {
				const aPri = Number.isFinite(a.priority) ? (a.priority as number) : -Infinity;
				const bPri = Number.isFinite(b.priority) ? (b.priority as number) : -Infinity;
				if (aPri === bPri) return 0;
				return bPri - aPri;
			});

		const combined = [...sortByPriority(active), ...sortByPriority(inactive)];

		return {
			stretchTemplate: combined,
			templateVersion: version,
			oneOffs: oneOffs as OneOffTask[]
		};
	} catch (error) {
		console.error('Failed to load stretch template, using fallback', error);
		const fallback: StretchTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return {
			stretchTemplate: fallback,
			templateVersion: Date.now(),
			oneOffs: [] as OneOffTask[]
		};
	}
};
