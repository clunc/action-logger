import type { RecurringTask, RecurringTaskTemplate } from '$lib/types';

const ENDPOINT = '/api/recurring';

export async function createRecurringClient(input: Partial<RecurringTaskTemplate>): Promise<RecurringTask> {
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ task: input })
	});

	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error || `Failed to create recurring task (${res.status})`);
	}

	const data = (await res.json()) as { task?: RecurringTask };
	if (!data.task) throw new Error('Invalid response from server');
	return data.task;
}

export async function deleteRecurringClient(id: number): Promise<void> {
	const res = await fetch(`${ENDPOINT}?id=${id}`, { method: 'DELETE' });
	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error || `Failed to delete recurring task (${res.status})`);
	}
}

export async function listRecurringClient(): Promise<RecurringTask[]> {
	const res = await fetch(ENDPOINT);
	if (!res.ok) {
		throw new Error(`Failed to load recurring tasks (${res.status})`);
	}
	const data = (await res.json()) as { tasks?: RecurringTask[] };
	return data.tasks ?? [];
}
