import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readHistory, replaceHistory, appendHistory } from '$lib/server/historyStore';
import type { HistoryEntry } from '$lib/types';

const toHistoryArray = (payload: unknown): HistoryEntry[] => {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload as HistoryEntry[];
	if (typeof payload === 'object') return [payload as HistoryEntry];
	return [];
};

const toCriteriaArray = (payload: unknown): Partial<HistoryEntry>[] => {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload as Partial<HistoryEntry>[];
	if (typeof payload === 'object') return [payload as Partial<HistoryEntry>];
	return [];
};

const hasCriteria = (crit: Partial<HistoryEntry>) =>
	crit.taskId !== undefined ||
	crit.task !== undefined ||
	crit.subtaskNumber !== undefined ||
	crit.timestamp !== undefined ||
	crit.occurrenceDate !== undefined ||
	crit.status !== undefined;

const matches = (entry: HistoryEntry, crit: Partial<HistoryEntry>) =>
	(crit.taskId === undefined || entry.taskId === crit.taskId) &&
	(crit.task === undefined || entry.task === crit.task) &&
	(crit.subtaskNumber === undefined || entry.subtaskNumber === crit.subtaskNumber) &&
	(crit.timestamp === undefined || entry.timestamp === crit.timestamp) &&
	(crit.occurrenceDate === undefined || entry.occurrenceDate === crit.occurrenceDate) &&
	(crit.status === undefined || entry.status === crit.status);

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return json({ history });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => [])) as unknown;
	const entries =
		(body as any)?.entries && Array.isArray((body as any).entries)
			? ((body as any).entries as HistoryEntry[])
			: toHistoryArray(body);
	await replaceHistory(entries);
	return json({ ok: true, count: entries.length });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => [])) as unknown;
	const entries =
		(body as any)?.entries && Array.isArray((body as any).entries)
			? ((body as any).entries as HistoryEntry[])
			: toHistoryArray(body);
	if (!entries.length) return json({ ok: false, message: 'No entries provided' }, { status: 400 });
	await appendHistory(entries);
	return json({ ok: true, count: entries.length });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => [])) as unknown;
	const entry = (body as any)?.entry;
	const entries = (body as any)?.entries;
	const criteriaPayload = entry ?? entries ?? body;
	const criteriaList = toCriteriaArray(criteriaPayload).filter(hasCriteria);
	if (!criteriaList.length) {
		return json({ ok: false, message: 'No delete criteria provided' }, { status: 400 });
	}

	const all = await readHistory();
	const filtered = all.filter((entry) => !criteriaList.some((crit) => matches(entry, crit)));
	const removed = all.length - filtered.length;
	await replaceHistory(filtered);
	return json({ ok: true, removed });
};
