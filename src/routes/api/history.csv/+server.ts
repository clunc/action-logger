import { text } from '@sveltejs/kit';
import { readHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';

function toCsv(rows: {
	stretch: string;
	holdNumber: number;
	durationSeconds: number;
	timestamp: string;
}[]) {
	const header = 'stretch,holdNumber,durationSeconds,timestamp';
	const lines = rows.map((row) =>
		[row.stretch, row.holdNumber.toString(), row.durationSeconds.toString(), row.timestamp].join(',')
	);

	return [header, ...lines].join('\n');
}

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return text(toCsv(history), {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="stretch-history.csv"'
		}
	});
};
