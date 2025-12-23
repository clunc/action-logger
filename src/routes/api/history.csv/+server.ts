import { text } from '@sveltejs/kit';
import { readHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';

function toCsv(rows: { task: string; subtaskNumber: number; durationSeconds: number; timestamp: string }[]) {
	const header = 'task,subtaskNumber,durationSeconds,timestamp';
	const lines = rows.map((row) =>
		[row.task, row.subtaskNumber.toString(), row.durationSeconds.toString(), row.timestamp].join(',')
	);

	return [header, ...lines].join('\n');
}

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return text(toCsv(history), {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="task-history.csv"'
		}
	});
};
