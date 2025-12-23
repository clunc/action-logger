import type { PageServerLoad } from './$types';
import { loadStretchTemplate } from '$lib/server/stretchConfig';
import type { StretchTemplate } from '$lib/types';

export const load: PageServerLoad = async () => {
	try {
		const { template, version } = await loadStretchTemplate();
		return { stretchTemplate: template, templateVersion: version };
	} catch (error) {
		console.error('Failed to load stretch template, using fallback', error);
		const fallback: StretchTemplate[] = [{ name: 'Forward Fold', defaultDurationSeconds: 60 }];
		return { stretchTemplate: fallback, templateVersion: Date.now() };
	}
};
