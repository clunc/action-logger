import type { HistoryEntry } from '$lib/types';

const HISTORY_ENDPOINT = '/api/history';

export async function fetchHistory(): Promise<HistoryEntry[]> {
	const res = await fetch(HISTORY_ENDPOINT);

	if (!res.ok) {
		throw new Error(`Failed to load history (${res.status})`);
	}

	const data = (await res.json()) as { history: HistoryEntry[] };
	return Array.isArray(data.history) ? data.history : [];
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
	const res = await fetch(HISTORY_ENDPOINT, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entries })
	});

	if (!res.ok) {
		throw new Error(`Failed to append history (${res.status})`);
	}
}

export async function deleteHistoryEntry(entry: {
	stretch: string;
	holdNumber: number;
	timestamp: string;
}): Promise<void> {
	const res = await fetch(HISTORY_ENDPOINT, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entry })
	});

	if (!res.ok) {
		throw new Error(`Failed to delete history entry (${res.status})`);
	}
}
