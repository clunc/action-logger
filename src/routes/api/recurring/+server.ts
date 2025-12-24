import { json } from '@sveltejs/kit';
import { createRecurringTask, deleteRecurringById, getRecurringBackendStatus, listRecurringTasks } from '$lib/server/recurringStore';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const tasks = await listRecurringTasks();
	return json({ tasks, backend: getRecurringBackendStatus() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const task = (body as { task?: unknown })?.task;

	if (!task || typeof task !== 'object') {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	try {
		const created = await createRecurringTask(task as Record<string, unknown>);
		return json({ task: created });
	} catch (error: unknown) {
		console.error('recurring POST failed', error);
		const message = error instanceof Error ? error.message : 'Failed to create task';
		return json({ error: message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: 'Invalid id' }, { status: 400 });
	}

	try {
		const deleted = await deleteRecurringById(id);
		return json({ ok: true, deleted });
	} catch (error) {
		console.error('recurring DELETE failed', error);
		return json({ error: 'Failed to delete task' }, { status: 400 });
	}
};
