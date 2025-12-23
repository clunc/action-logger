import { json } from '@sveltejs/kit';
import { getStretchTemplateVersion } from '$lib/server/taskConfig';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const version = await getStretchTemplateVersion();
		return json({ version });
	} catch (error) {
		console.error('Failed to get template version', error);
		return json({ version: Date.now() });
	}
};
