import type { OneOffTask, OneOffTaskTemplate } from '$lib/types';
import { toDateString } from '$lib/date';

const ENDPOINT = '/api/one-offs';

export async function createOneOffClient(input: Partial<OneOffTaskTemplate>): Promise<OneOffTask> {
	const today = toDateString(new Date());
	const payload = {
		task: {
			...input,
			scheduled_for: input.scheduled_for ?? today
		}
	};

	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error || `Failed to create one-off (${res.status})`);
	}

	const data = (await res.json()) as { task?: OneOffTask };
	if (!data.task) throw new Error('Invalid response from server');
	return data.task;
}
