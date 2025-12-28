import { json } from '@sveltejs/kit';
import {
	createOneOff,
	deleteAllOneOffs,
	deleteOneOffById,
	getOneOffBackendStatus,
	listOneOffs
} from '$lib/server/oneOffStore';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const date = url.searchParams.get('date') ?? undefined;
	const tasks = await listOneOffs(date);
	return json({ tasks, backend: getOneOffBackendStatus() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const task = (body as { task?: unknown })?.task;

	if (!task || typeof task !== 'object') {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	try {
		const created = await createOneOff(task as Record<string, unknown>);
		return json({ task: created });
	} catch (error: unknown) {
		console.error('one-offs POST failed', error);
		const message = error instanceof Error ? error.message : 'Failed to create task';
		return json({ error: message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const idParam = url.searchParams.get('id');
	const id = idParam ? Number(idParam) : null;

	try {
		if (id === null) {
			const deleted = await deleteAllOneOffs();
			return json({ ok: true, deleted });
		}

		if (!Number.isInteger(id) || id <= 0) {
			return json({ error: 'Invalid id' }, { status: 400 });
		}

		const deleted = await deleteOneOffById(id);
		return json({ ok: true, deleted, mode: 'single' });
	} catch (error) {
		console.error('one-offs DELETE failed', error);
		return json({ error: 'Failed to delete task' }, { status: 400 });
	}
};
