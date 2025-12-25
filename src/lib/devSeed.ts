import type { HistoryEntry, OneOffTaskTemplate, RecurringTaskTemplate, TaskTemplate } from '$lib/types';

export function seededTemplates(): TaskTemplate[] {
	return [
		{
			name: 'Plan the day',
			defaultDurationSeconds: 300,
			pillar: 'career',
			pillarEmoji: '💼',
			recurrence: { frequency: 'daily' },
			priority: 5
		},
		{
			name: 'Deep work block',
			defaultDurationSeconds: 1800,
			pillar: 'career',
			pillarEmoji: '💼',
			recurrence: { frequency: 'daily' },
			priority: 4
		},
		{
			name: 'Health break (water & snack)',
			defaultDurationSeconds: 300,
			pillar: 'health',
			pillarEmoji: '💪',
			recurrence: { frequency: 'daily' },
			priority: 3
		}
	];
}

export function seededRecurring(): RecurringTaskTemplate[] {
	return [
		{
			title: 'Weekly planning',
			type: 'operational',
			pipeline: 'ops',
			pillar: 'career',
			recurrence: { frequency: 'weekly', days: ['Mon'] },
			priority: 3,
			notes: 'Prep week tasks'
		},
		{
			title: 'Monthly finance review',
			type: 'operational',
			pipeline: 'finances',
			pillar: 'finances',
			recurrence: { frequency: 'monthly', day_of_month: 23 },
			priority: 2
		},
		{
			title: 'Annual goals reset',
			type: 'strategic',
			pipeline: 'career',
			pillar: 'career',
			recurrence: { frequency: 'yearly', month: 12, day: 23 },
			priority: 1
		}
	];
}

export function seededOneOffs(todayIso: string): OneOffTaskTemplate[] {
	return [
		{
			title: 'Prep slides',
			type: 'operational',
			pipeline: 'ops',
			pillar: 'career',
			scheduled_for: todayIso,
			priority: 2
		},
		{
			title: 'Doctor appointment',
			type: 'operational',
			pipeline: 'personal',
			pillar: 'health',
			scheduled_for: todayIso,
			priority: 3
		},
		{
			title: 'File taxes',
			type: 'operational',
			pipeline: 'finances',
			pillar: 'finances',
			scheduled_for: todayIso,
			priority: 4
		}
	];
}

export function seededHistory(todayIso: string): HistoryEntry[] {
	const ts = `${todayIso}T08:00:00.000Z`;
	return [
		{
			taskId: 'seed-plan',
			task: 'Plan the day',
			subtaskNumber: 1,
			durationSeconds: 300,
			timestamp: ts,
			status: 'done'
		}
	];
}
