import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadTaskTemplate, loadPillarEmojiMap } from '$lib/server/taskConfig';
import { listRecurringTasks, createRecurringTask } from '$lib/server/recurringStore';
import { listOneOffs, createOneOff } from '$lib/server/oneOffStore';
import { isDevEnv } from '$lib/env';
import { seededTemplates, seededRecurring, seededOneOffs } from '$lib/devSeed';
import { todayIsoString } from '$lib/date';

// Aggregated snapshot for clients that want all task-related data in one request.
export const GET: RequestHandler = async () => {
	try {
		let { template, version } = await loadTaskTemplate();
		const { map: pillarEmojiMap } = await loadPillarEmojiMap();
		let recurringTasks = await listRecurringTasks();
		let oneOffs = await listOneOffs();

		// In dev, mirror UI seeding to keep the endpoint useful with empty stores.
		if (isDevEnv) {
			if (!template.length) {
				template = seededTemplates();
			}
			if (!recurringTasks.length) {
				recurringTasks = await Promise.all(seededRecurring().map((entry) => createRecurringTask(entry)));
			}
			if (!oneOffs.length) {
				const todayIso = todayIsoString();
				oneOffs = await Promise.all(seededOneOffs(todayIso).map((entry) => createOneOff(entry)));
			}
		}

		return json({
			templates: template,
			templateVersion: version,
			recurringTasks,
			oneOffs,
			pillarEmojiMap
		});
	} catch (error) {
		console.error('Failed to load all data', error);
		return json({ error: 'Failed to load data' }, { status: 500 });
	}
};
