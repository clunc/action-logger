import type { RecurrenceRule, WeekdayAbbrev } from '$lib/types';
import { now } from './date';

const WEEKDAY_NAMES: WeekdayAbbrev[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isRecurrenceActiveOnDate(recurrence: RecurrenceRule | undefined, date: Date = new Date()): boolean {
	if (!recurrence || recurrence.frequency === 'daily') return true;

	if (recurrence.frequency === 'weekly') {
		if (!recurrence.days || recurrence.days.length === 0) return true;
		const todayName = WEEKDAY_NAMES[date.getDay()];
		return recurrence.days.includes(todayName);
	}

	if (recurrence.frequency === 'monthly') {
		if (!recurrence.day_of_month) return date.getDate() === 1;
		return date.getDate() === recurrence.day_of_month;
	}

	if (recurrence.frequency === 'yearly') {
		const monthMatch = recurrence.month ? date.getMonth() + 1 === recurrence.month : true;
		const dayMatch = recurrence.day ? date.getDate() === recurrence.day : true;
		return monthMatch && dayMatch;
	}

	return true;
}

export function isRecurrenceActiveToday(recurrence: RecurrenceRule | undefined): boolean {
	return isRecurrenceActiveOnDate(recurrence, now());
}
