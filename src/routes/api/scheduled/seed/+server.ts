import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { seedScheduledHistory } from '$lib/server/scheduledHistory';
import { now } from '$lib/date';

export const POST: RequestHandler = async () => {
	const target = now();
	const history = await seedScheduledHistory({ targetDate: target });
	return json({ ok: true, count: history.length, date: target.toISOString().slice(0, 10) });
};
