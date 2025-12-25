import type { HistoryEntry, TaskTemplate } from '$lib/types';

export type OverdueChecker = (task: TaskTemplate, history: HistoryEntry[], ready: boolean) => boolean;

const priorityValue = (task: TaskTemplate) =>
	Number.isFinite(task.priority) ? (task.priority as number) : -Infinity;

/**
 * Sort templates so overdue items surface first, then by priority, due date, and name.
 */
export function sortTemplatesByOverdue(
	items: TaskTemplate[],
	history: HistoryEntry[],
	ready: boolean,
	isOverdue: OverdueChecker
): TaskTemplate[] {
	return [...items].sort((a, b) => {
		const aOverdue = isOverdue(a, history, ready);
		const bOverdue = isOverdue(b, history, ready);
		if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

		const aPri = priorityValue(a);
		const bPri = priorityValue(b);
		if (aPri !== bPri) return bPri - aPri;

		if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
			return a.dueDate.localeCompare(b.dueDate);
		}

		return (a.name || '').localeCompare(b.name || '');
	});
}
