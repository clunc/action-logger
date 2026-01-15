import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Lightweight, static description of the public API surface so clients can introspect endpoints without external docs.
export const GET: RequestHandler = async () => {
	const now = new Date().toISOString();

	return json({
		updatedAt: now,
		endpoints: [
			{
				path: '/api/tasks',
				method: 'GET',
				description: 'Return task templates, recurring tasks, one-offs, template version, and pillar emoji map (seeds in dev).',
				query: [],
				body: null,
				responses: {
					ok: {
						description: 'Aggregated task metadata.',
						schema: '{ templates, templateVersion, recurringTasks, oneOffs, pillarEmojiMap }'
					},
					error: { description: '500 with { error }' }
				}
			},
			{
				path: '/api/one-offs',
				method: 'GET',
				description: 'List one-off tasks, optionally filtered by date.',
				query: ['date=YYYY-MM-DD (optional)'],
				body: null,
				responses: {
					ok: { description: '{ tasks, backend }' },
					error: { description: '500 with { error }' }
				}
			},
			{
				path: '/api/one-offs',
				method: 'POST',
				description: 'Create a one-off task.',
				query: [],
				body: '{ task: { title, type, pipeline, pillar, scheduled_for, time_block?, priority?, context?, notes? } }',
				responses: {
					ok: { description: '{ task }' },
					error: { description: '400 with validation error' }
				}
			},
			{
				path: '/api/one-offs',
				method: 'DELETE',
				description: 'Delete one-off tasks.',
				query: ['id=number (optional; omit to delete all)'],
				body: null,
				responses: {
					ok: { description: '{ ok, deleted, mode? }' },
					error: { description: '400 with { error }' }
				}
			},
			{
				path: '/api/recurring',
				method: 'GET',
				description: 'List recurring task templates.',
				query: [],
				body: null,
				responses: {
					ok: { description: '{ tasks, backend }' },
					error: { description: '500 with { error }' }
				}
			},
			{
				path: '/api/recurring',
				method: 'POST',
				description: 'Create a recurring task template.',
				query: [],
				body: '{ task: { title, type, pipeline, pillar, recurrence?, time_block?, priority?, context?, notes? } }',
				responses: {
					ok: { description: '{ task }' },
					error: { description: '400 with validation error' }
				}
			},
			{
				path: '/api/recurring',
				method: 'DELETE',
				description: 'Delete recurring tasks.',
				query: ['id=number (optional; omit to delete all)'],
				body: null,
				responses: {
					ok: { description: '{ ok, deleted, mode? }' },
					error: { description: '400 with { error }' }
				}
			},
			{
				path: '/api/history',
				method: 'GET',
				description: 'Fetch history entries (newest first).',
				query: [],
				body: null,
				responses: { ok: { description: '{ history }' } }
			},
			{
				path: '/api/history',
				method: 'PUT',
				description: 'Replace all history entries.',
				query: [],
				body: 'HistoryEntry[] or { entries: HistoryEntry[] }',
				responses: { ok: { description: '{ ok: true, count }' } }
			},
			{
				path: '/api/history',
				method: 'POST',
				description: 'Append history entries.',
				query: [],
				body: 'HistoryEntry[] or { entries: HistoryEntry[] }',
				responses: {
					ok: { description: '{ ok: true, count }' },
					error: { description: '400 when no entries provided' }
				}
			},
			{
				path: '/api/history',
				method: 'DELETE',
				description: 'Delete history entries matching criteria.',
				query: [],
				body: '{ entry | entries | criteriaObject } where criteria keys: taskId, task, subtaskNumber, timestamp, occurrenceDate, status',
				responses: {
					ok: { description: '{ ok: true, removed }' },
					error: { description: '400 when no criteria provided' }
				}
			},
			{
				path: '/api/history.csv',
				method: 'GET',
				description: 'Download history as CSV.',
				query: [],
				body: null,
				responses: {
					ok: { description: 'text/csv with task,subtaskNumber,durationSeconds,timestamp' }
				}
			},
			{
				path: '/api/task-template-version',
				method: 'GET',
				description: 'Return the last modified time for the task template file.',
				query: [],
				body: null,
				responses: { ok: { description: '{ version }' } }
			},
			{
				path: '/api/stretch-template-version',
				method: 'GET',
				description: 'Alias of task-template-version; kept for backward compatibility.',
				query: [],
				body: null,
				responses: { ok: { description: '{ version }' } }
			}
		]
	});
};
