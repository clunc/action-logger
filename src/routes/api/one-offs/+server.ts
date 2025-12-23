import { json } from '@sveltejs/kit';
import { createOneOff, getOneOffBackendStatus, listOneOffs } from '$lib/server/oneOffStore';
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
