import type { HistoryEntry, SubtaskEntry, SessionTask, TaskTemplate } from './types';

export const DEFAULT_SUBTASK_SECONDS = 65;

export const todayString = () => new Date().toDateString();

export function createSession(template: TaskTemplate[], history: HistoryEntry[]): SessionTask[] {
	const today = todayString();

	const cloneHold = (taskTemplate: TaskTemplate): SessionTask => {
		const defaultDurationSeconds = taskTemplate.defaultDurationSeconds ?? DEFAULT_SUBTASK_SECONDS;

		const totalSubtasks = Math.max(1, taskTemplate.subtaskLabels?.length ?? 1);
		const subtasks: SubtaskEntry[] = Array.from({ length: totalSubtasks }, (_, idx) => {
			const subtaskNumber = idx + 1;
			const todaysLog = history.find(
				(h) =>
					h.task === taskTemplate.name &&
					h.subtaskNumber === subtaskNumber &&
					new Date(h.timestamp).toDateString() === today
			);

			if (todaysLog) {
				return {
					subtaskNumber,
					durationSeconds: todaysLog.durationSeconds,
					completed: true,
					timestamp: todaysLog.timestamp
				};
			}

			return {
				subtaskNumber,
				durationSeconds: 0,
				completed: false,
				timestamp: null
			};
		});

		return { ...taskTemplate, subtasks };
	};

	return template.map(cloneHold);
}

export function formatTimestamp(isoString: string) {
	const date = new Date(isoString);
	const today = todayString();

	if (date.toDateString() === today) {
		return `Today, ${date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function getSubtaskLabel(taskName: string, subtaskNumber: number, template: TaskTemplate[]) {
	const entry = template.find((task) => task.name === taskName);
	const label = entry?.subtaskLabels?.[subtaskNumber - 1];
	if (label) return label;
	if (entry?.subtaskLabels?.length) return `Subtask ${subtaskNumber}`;
	return null;
}
