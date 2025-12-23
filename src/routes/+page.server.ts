import type { PageServerLoad } from './$types';
import { loadStretchTemplate } from '$lib/server/stretchConfig';
import type { StretchTemplate } from '$lib/types';

export const load: PageServerLoad = async () => {
	try {
		const { template, version } = await loadStretchTemplate();
		const sorted = [...template].sort((a, b) => {
			const aPri = Number.isFinite(a.priority) ? (a.priority as number) : -Infinity;
			const bPri = Number.isFinite(b.priority) ? (b.priority as number) : -Infinity;
			if (aPri === bPri) return 0;
			return bPri - aPri;
		});
		return { stretchTemplate: sorted, templateVersion: version };
	} catch (error) {
		console.error('Failed to load stretch template, using fallback', error);
		const fallback: StretchTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return { stretchTemplate: fallback, templateVersion: Date.now() };
	}
};
