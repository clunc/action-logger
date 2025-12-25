import { json } from '@sveltejs/kit';
import { replaceHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';
import type { HistoryEntry } from '$lib/types';

const isValidEntry = (entry: unknown): entry is HistoryEntry => {
	if (!entry || typeof entry !== 'object') return false;

	const candidate = entry as Record<string, unknown>;
	return (
		(candidate.taskId === undefined || typeof candidate.taskId === 'string') &&
		typeof candidate.task === 'string' &&
		typeof candidate.subtaskNumber === 'number' &&
		typeof candidate.durationSeconds === 'number' &&
		typeof candidate.timestamp === 'string' &&
		(candidate.status === undefined ||
			candidate.status === 'done' ||
			candidate.status === 'skipped')
	);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const history = (body as { history?: unknown })?.history;

	if (!Array.isArray(history) || !history.every(isValidEntry)) {
		return json({ error: 'Invalid history payload' }, { status: 400 });
	}

	await replaceHistory(history);
	return json({ ok: true, count: history.length });
};
