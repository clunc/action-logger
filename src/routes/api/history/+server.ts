import { json } from '@sveltejs/kit';
import { appendHistory, deleteTodayEntry, getHistoryBackendStatus, readHistory } from '$lib/server/historyStore';
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
		typeof candidate.timestamp === 'string'
	);
};

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return json({ history, backend: getHistoryBackendStatus() });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const entries = (body as { entries?: unknown })?.entries;

	if (!Array.isArray(entries) || !entries.every(isValidEntry)) {
		return json({ error: 'Invalid entries payload' }, { status: 400 });
	}

	await appendHistory(entries);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const entry = (body as { entry?: unknown })?.entry;

	if (
		!entry ||
		typeof entry !== 'object' ||
		((entry as Record<string, unknown>).taskId !== undefined &&
			typeof (entry as Record<string, unknown>).taskId !== 'string') ||
		typeof (entry as Record<string, unknown>).task !== 'string' ||
		typeof (entry as Record<string, unknown>).timestamp !== 'string' ||
		typeof (entry as Record<string, unknown>).subtaskNumber !== 'number'
	) {
		return json({ error: 'Invalid delete payload' }, { status: 400 });
	}

	const { taskId, task, subtaskNumber, timestamp } = entry as {
		taskId?: string;
		task: string;
		subtaskNumber: number;
		timestamp: string;
	};

	const deleted = await deleteTodayEntry({ taskId, task, subtaskNumber, timestamp });
	return json({ ok: true, deleted });
};
