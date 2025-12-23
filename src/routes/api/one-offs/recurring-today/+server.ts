import { json } from '@sveltejs/kit';
import { isRecurrenceActiveOnDate } from '$lib/recurrence';
import { toDateString } from '$lib/date';
import { createOneOff, listOneOffs } from '$lib/server/oneOffStore';
import { loadRecurringTemplates } from '$lib/server/taskTemplates';
import type { RequestHandler } from './$types';
import type { RecurringTaskTemplate } from '$lib/types';

const dedupeKey = (task: RecurringTaskTemplate) => `${task.title.toLowerCase()}|${task.pipeline.toLowerCase()}`;

export const POST: RequestHandler = async () => {
	try {
		const today = new Date();
		const todayStr = toDateString(today);

		const [templates, existing] = await Promise.all([
			loadRecurringTemplates(),
			listOneOffs(todayStr)
		]);

		const activeTemplates = templates.filter((task) => isRecurrenceActiveOnDate(task.recurrence, today));
		const seen = new Set(existing.map((task) => `${task.title.toLowerCase()}|${task.pipeline.toLowerCase()}`));

		const created = [];
		for (const task of activeTemplates) {
			const key = dedupeKey(task);
			if (seen.has(key)) continue;
			const record = await createOneOff({
				title: task.title,
				type: task.type,
				pipeline: task.pipeline,
				pillar: task.pillar,
				scheduled_for: todayStr,
				time_block: task.time_block,
				priority: task.priority,
				context: task.context,
				notes: task.notes
			});
			created.push(record);
			seen.add(key);
		}

		return json({
			date: todayStr,
			activeTemplates: activeTemplates.length,
			created: created.length,
			skipped: activeTemplates.length - created.length,
			tasks: created
		});
	} catch (error) {
		console.error('Failed to create recurring tasks for today', error);
		return json({ error: 'Failed to create recurring tasks for today' }, { status: 500 });
	}
};
