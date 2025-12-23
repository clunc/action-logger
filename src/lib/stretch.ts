import type { HistoryEntry, HoldEntry, SessionStretch, StretchTemplate } from './types';

export const DEFAULT_HOLD_SECONDS = 65;

export const todayString = () => new Date().toDateString();

export function createSession(template: StretchTemplate[], history: HistoryEntry[]): SessionStretch[] {
	const today = todayString();

	const cloneHold = (stretchTemplate: StretchTemplate): SessionStretch => {
		const defaultDurationSeconds = stretchTemplate.defaultDurationSeconds ?? DEFAULT_HOLD_SECONDS;

		const totalHolds = Math.max(1, stretchTemplate.holdLabels?.length ?? 1);
		const holds: HoldEntry[] = Array.from({ length: totalHolds }, (_, idx) => {
			const holdNumber = idx + 1;
			const todaysLog = history.find(
				(h) =>
					h.stretch === stretchTemplate.name &&
					h.holdNumber === holdNumber &&
					new Date(h.timestamp).toDateString() === today
			);

			if (todaysLog) {
				return {
					holdNumber,
					durationSeconds: todaysLog.durationSeconds,
					completed: true,
					timestamp: todaysLog.timestamp
				};
			}

			return {
				holdNumber,
				durationSeconds: 0,
				completed: false,
				timestamp: null
			};
		});

		return { ...stretchTemplate, holds };
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

export function getHoldLabel(stretchName: string, holdNumber: number, template: StretchTemplate[]) {
	const entry = template.find((stretch) => stretch.name === stretchName);
	const label = entry?.holdLabels?.[holdNumber - 1];
	if (label) return label;
	if (entry?.holdLabels?.length) return `Hold ${holdNumber}`;
	return null;
}
