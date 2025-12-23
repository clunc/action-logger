import { json } from '@sveltejs/kit';
import { getTaskTemplateVersion } from '$lib/server/stretchConfig';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const version = await getTaskTemplateVersion();
		return json({ version });
	} catch (error) {
		console.error('Failed to get task template version', error);
		return json({ version: Date.now() });
	}
};
