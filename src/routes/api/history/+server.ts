import { json } from '@sveltejs/kit';
import { appendHistory, deleteTodayEntry, getHistoryBackendStatus, readHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';
import type { HistoryEntry } from '$lib/types';

const isValidEntry = (entry: unknown): entry is HistoryEntry => {
	if (!entry || typeof entry !== 'object') return false;

	const candidate = entry as Record<string, unknown>;
	return (
		typeof candidate.stretch === 'string' &&
		typeof candidate.holdNumber === 'number' &&
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
		typeof (entry as Record<string, unknown>).stretch !== 'string' ||
		typeof (entry as Record<string, unknown>).timestamp !== 'string' ||
		typeof (entry as Record<string, unknown>).holdNumber !== 'number'
	) {
		return json({ error: 'Invalid delete payload' }, { status: 400 });
	}

	const { stretch, holdNumber, timestamp } = entry as {
		stretch: string;
		holdNumber: number;
		timestamp: string;
	};

	const deleted = await deleteTodayEntry({ stretch, holdNumber, timestamp });
	return json({ ok: true, deleted });
};
