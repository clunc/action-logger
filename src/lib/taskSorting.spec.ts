import { describe, expect, it } from 'vitest';
import { sortTemplatesByOverdue } from './taskSorting';
import type { HistoryEntry, TaskTemplate } from './types';

const baseTask = (name: string, priority = 0, dueDate?: string): TaskTemplate => ({
	name,
	defaultDurationSeconds: 0,
	subtaskLabels: [''],
	priority,
	dueDate
});

const isOverdueStub = (overdueNames: Set<string>) => (task: TaskTemplate) => overdueNames.has(task.name);

describe('sortTemplatesByOverdue', () => {
	it('orders overdue first, then priority, then due date, then name', () => {
		const tasks: TaskTemplate[] = [
			baseTask('C low', 1),
			baseTask('A overdue low', 1),
			baseTask('B overdue high', 5),
			baseTask('D same pri earlier due', 3, '2024-01-01'),
			baseTask('E same pri later due', 3, '2024-02-01')
		];

		const overdue = new Set(['A overdue low', 'B overdue high']);
		const sorted = sortTemplatesByOverdue(tasks, [] as HistoryEntry[], true, isOverdueStub(overdue));

		expect(sorted.map((t) => t.name)).toEqual([
			'B overdue high', // overdue + higher priority
			'A overdue low', // overdue + lower priority
			'D same pri earlier due', // non-overdue, higher priority & earlier due
			'E same pri later due',
			'C low'
		]);
	});
});
