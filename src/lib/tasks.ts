import type { HistoryEntry, SubtaskEntry, SessionTask, TaskTemplate } from './types';
import { todayDisplayString } from './date';

export const DEFAULT_SUBTASK_SECONDS = 65;

export const todayString = () => todayDisplayString();

export function createSession(template: TaskTemplate[], history: HistoryEntry[]): SessionTask[] {
	const today = todayString();
	const nameCounts = template.reduce((acc, task) => {
		acc[task.name] = (acc[task.name] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const cloneHold = (taskTemplate: TaskTemplate): SessionTask => {
		const defaultDurationSeconds = taskTemplate.defaultDurationSeconds ?? DEFAULT_SUBTASK_SECONDS;
		const allowNameFallback = (nameCounts[taskTemplate.name] ?? 1) === 1;

		const totalSubtasks = Math.max(1, taskTemplate.subtaskLabels?.length ?? 1);
		const subtasks: SubtaskEntry[] = Array.from({ length: totalSubtasks }, (_, idx) => {
			const subtaskNumber = idx + 1;
			const todaysLog = history.find(
				(h) =>
					((taskTemplate.id && h.taskId === taskTemplate.id) ||
						(allowNameFallback && h.task === taskTemplate.name)) &&
					h.subtaskNumber === subtaskNumber &&
					new Date(h.timestamp).toDateString() === today
			);

			if (todaysLog) {
				const status = todaysLog.status ?? 'done';
				const isInProgress = status === 'in-progress';
				const isDone = status === 'done';
				const isSkipped = status === 'skipped';
				const isScheduled = status === 'scheduled';
				return {
					subtaskNumber,
					durationSeconds: todaysLog.durationSeconds,
					completed: isDone,
					timestamp: todaysLog.timestamp,
					startedAt: isInProgress ? todaysLog.timestamp : null,
					status: isInProgress
						? 'in-progress'
						: isDone
							? 'done'
							: isSkipped
								? 'skipped'
								: isScheduled
									? 'scheduled'
									: 'pending'
				};
			}

			return {
				subtaskNumber,
				durationSeconds: 0,
				completed: false,
				timestamp: null,
				startedAt: null,
				status: 'pending'
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

export function getSubtaskLabel(
	taskName: string,
	subtaskNumber: number,
	template: TaskTemplate[],
	taskId?: string | null
) {
	const entry = template.find((task) => (taskId ? task.id === taskId : task.name === taskName));
	const label = entry?.subtaskLabels?.[subtaskNumber - 1];
	if (label) return label;
	if (entry?.subtaskLabels?.length) return `Subtask ${subtaskNumber}`;
	return null;
}
