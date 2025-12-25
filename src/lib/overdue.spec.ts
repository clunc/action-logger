import { describe, expect, it } from 'vitest';
import { isOverdueOneOff, isOverdueRecurring } from './overdue';
import type { HistoryEntry, RecurrenceRule } from './types';

const makeDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const historyEntry = (dateIso: string, taskId: string, status: 'done' | 'skipped' = 'done'): HistoryEntry => ({
	taskId,
	task: taskId,
	subtaskNumber: 1,
	durationSeconds: 0,
	timestamp: `${dateIso}T08:00:00.000Z`,
	status,
	occurrenceDate: dateIso
});

describe('isOverdueOneOff', () => {
	it('flags one-offs strictly before today', () => {
		expect(isOverdueOneOff('2024-01-01', makeDate('2024-01-02'))).toBe(true);
		expect(isOverdueOneOff('2024-01-02', makeDate('2024-01-02'))).toBe(false);
	});
});

describe('isOverdueRecurring', () => {
	it('marks daily overdue only near end of day and not next morning', () => {
		const recurrence: RecurrenceRule = { frequency: 'daily' };
		const morning = makeDate('2025-12-25');
		morning.setUTCHours(12);
		const evening = makeDate('2025-12-25');
		evening.setUTCHours(20); // within the 6h pre-midnight window
		const nextMorning = makeDate('2025-12-26');
		nextMorning.setUTCHours(8);

		expect(
			isOverdueRecurring({ recurrence, history: [], taskId: 'daily', taskName: 'daily', now: morning })
		).toBe(false);
		expect(
			isOverdueRecurring({ recurrence, history: [], taskId: 'daily', taskName: 'daily', now: evening })
		).toBe(true);
		expect(
			isOverdueRecurring({ recurrence, history: [], taskId: 'daily', taskName: 'daily', now: nextMorning })
		).toBe(false);
	});

	it('only clears weekly when the most recent scheduled day is completed', () => {
		const recurrence: RecurrenceRule = { frequency: 'weekly', days: ['Mon', 'Wed', 'Fri'] };
		// Thu 2025-12-25 evening -> most recent scheduled day is Wed 2025-12-24
		const now = makeDate('2025-12-25');
		now.setUTCHours(20);
		const doneOnMonday = [historyEntry('2025-12-22', 'weekly')];
		const doneOnWednesday = [historyEntry('2025-12-24', 'weekly')];

		expect(
			isOverdueRecurring({ recurrence, history: doneOnMonday, taskId: 'weekly', taskName: 'weekly', now })
		).toBe(true);
		expect(
			isOverdueRecurring({ recurrence, history: doneOnWednesday, taskId: 'weekly', taskName: 'weekly', now })
		).toBe(false);
	});

	it('applies grace/visibility windows for monthly', () => {
		const recurrence: RecurrenceRule = { frequency: 'monthly', day_of_month: 20 };
		const overdueStart = makeDate('2025-12-23'); // after grace (>48h after end-of-day 20th)
		const visibleEnd = makeDate('2025-12-30'); // past the 7-day visibility window

		expect(
			isOverdueRecurring({
				recurrence,
				history: [],
				taskId: 'monthly',
				taskName: 'monthly',
				now: overdueStart
			})
		).toBe(true);
		expect(
			isOverdueRecurring({
				recurrence,
				history: [],
				taskId: 'monthly',
				taskName: 'monthly',
				now: visibleEnd
			})
		).toBe(false);
	});
});
