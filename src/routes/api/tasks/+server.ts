import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadTaskTemplate, loadPillarEmojiMap } from '$lib/server/taskConfig';
import { listRecurringTasks, createRecurringTask } from '$lib/server/recurringStore';
import { listOneOffs, createOneOff } from '$lib/server/oneOffStore';
import { isDevEnv } from '$lib/env';
import { seededTemplates, seededRecurring, seededOneOffs } from '$lib/devSeed';
import { todayIsoString } from '$lib/date';

export const GET: RequestHandler = async () => {
	try {
		let { template, version } = await loadTaskTemplate();
		const { map: pillarEmojiMap } = await loadPillarEmojiMap();
		let recurringTasks = await listRecurringTasks();
		let oneOffs = await listOneOffs();

		// In dev, mirror the UI behavior by seeding empty stores for quick testing.
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
		console.error('Failed to load all tasks', error);
		return json({ error: 'Failed to load tasks' }, { status: 500 });
	}
};
