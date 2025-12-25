import type { HistoryEntry, RecurrenceRule } from '$lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const dailyGraceHours = 6; // show daily overdue near end-of-day only, never the next morning
const weeklyGraceHours = 18; // start showing roughly a day after the scheduled weekday
const weeklyVisibleDays = 3; // keep weekly misses visible for ~half the week
const monthlyGraceHours = 48; // give extra room for monthly/yearly before flagging
const monthlyVisibleDays = 7; // keep the most recent monthly/yearly miss for up to 7 days

const weekdayOrder: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const mockTodayString =
	(typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MOCK_TODAY) ||
	(typeof process !== 'undefined' ? process.env?.MOCK_TODAY : undefined);
const parsedMockToday = mockTodayString ? new Date(`${mockTodayString}T12:00:00Z`) : null;
const mockToday = parsedMockToday && !Number.isNaN(parsedMockToday.getTime()) ? parsedMockToday : null;
const isDevMode =
	(typeof process !== 'undefined' && process.env?.APP_ENV === 'dev') ||
	(typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'development');

const resolveNow = (override?: Date) => {
	if (override) return override;
	if (isDevMode && mockToday) return mockToday;
	return new Date();
};

const startOfDay = (date: Date) => {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
};

const endOfDay = (date: Date) => {
	const d = startOfDay(date);
	d.setHours(23, 59, 59, 999);
	return d;
};

const matchesTask = (entry: HistoryEntry, taskId?: string | null, taskName?: string) => {
	if (taskId) return entry.taskId === taskId;
	return taskName ? entry.task === taskName : false;
};

const hasCompletionOnDate = (
	history: HistoryEntry[],
	targetIso: string,
	taskId?: string | null,
	taskName?: string
) =>
	history.some(
		(entry) =>
			matchesTask(entry, taskId, taskName) &&
			entry.status !== 'pending' &&
			entry.status !== undefined &&
			entry.timestamp.slice(0, 10) === targetIso
	);

const clampDay = (year: number, monthIndex: number, day: number) => {
	const lastDay = new Date(year, monthIndex + 1, 0).getDate();
	return Math.min(day, lastDay);
};

const mostRecentWeeklyDate = (days: string[] | undefined, now: Date) => {
	if (!days || days.length === 0) return startOfDay(now);
	const targetIdx = days.map((d) => weekdayOrder[d]);
	for (let offset = 0; offset < 7; offset++) {
		const candidate = new Date(now.getTime() - offset * DAY_MS);
		if (targetIdx.includes(candidate.getDay())) {
			return startOfDay(candidate);
		}
	}
	return startOfDay(now);
};

const mostRecentMonthlyDate = (dayOfMonth: number | undefined, now: Date) => {
	const targetDay = clampDay(now.getFullYear(), now.getMonth(), dayOfMonth ?? 1);
	const thisMonth = new Date(now);
	thisMonth.setDate(targetDay);
	thisMonth.setHours(0, 0, 0, 0);
	if (thisMonth <= now) return thisMonth;

	const prevMonth = new Date(now);
	prevMonth.setMonth(prevMonth.getMonth() - 1);
	prevMonth.setDate(clampDay(prevMonth.getFullYear(), prevMonth.getMonth(), dayOfMonth ?? 1));
	prevMonth.setHours(0, 0, 0, 0);
	return prevMonth;
};

const mostRecentYearlyDate = (month: number | undefined, day: number | undefined, now: Date) => {
	const targetMonth = (month ?? 1) - 1; // JS Date month is 0-based
	const targetDay = day ?? 1;
	const thisYear = new Date(now.getFullYear(), targetMonth, clampDay(now.getFullYear(), targetMonth, targetDay));
	thisYear.setHours(0, 0, 0, 0);
	if (thisYear <= now) return thisYear;

	const lastYear = new Date(now.getFullYear() - 1, targetMonth, clampDay(now.getFullYear() - 1, targetMonth, targetDay));
	lastYear.setHours(0, 0, 0, 0);
	return lastYear;
};

export function isOverdueOneOff(dueDate?: string | null, now?: Date) {
	const effectiveNow = resolveNow(now);
	if (!dueDate) return false;
	const todayIso = isoDate(effectiveNow);
	return dueDate < todayIso;
}

export function isOverdueRecurring(params: {
	recurrence: RecurrenceRule;
	history: HistoryEntry[];
	taskId?: string | null;
	taskName: string;
	now?: Date;
}): boolean {
	const effectiveNow = resolveNow(params.now);
	const { recurrence, history, taskId, taskName } = params;
	const todayIso = isoDate(effectiveNow);

	if (recurrence.frequency === 'daily') {
		if (hasCompletionOnDate(history, todayIso, taskId, taskName)) return false;
		const dueStart = startOfDay(effectiveNow);
		const overdueStart = new Date(endOfDay(dueStart).getTime() - dailyGraceHours * 60 * 60 * 1000);
		return effectiveNow >= overdueStart && effectiveNow <= endOfDay(dueStart);
	}

	if (recurrence.frequency === 'weekly') {
		const dueDate = mostRecentWeeklyDate(recurrence.days, effectiveNow);
		const dueIso = isoDate(dueDate);
		if (hasCompletionOnDate(history, dueIso, taskId, taskName)) return false;
		const overdueStart = new Date(endOfDay(dueDate).getTime() + weeklyGraceHours * 60 * 60 * 1000);
		const overdueEnd = new Date(overdueStart.getTime() + weeklyVisibleDays * DAY_MS);
		return effectiveNow >= overdueStart && effectiveNow <= overdueEnd;
	}

	if (recurrence.frequency === 'monthly') {
		const dueDate = mostRecentMonthlyDate(recurrence.day_of_month, effectiveNow);
		const dueIso = isoDate(dueDate);
		if (hasCompletionOnDate(history, dueIso, taskId, taskName)) return false;
		const overdueStart = new Date(endOfDay(dueDate).getTime() + monthlyGraceHours * 60 * 60 * 1000);
		const overdueEnd = new Date(overdueStart.getTime() + monthlyVisibleDays * DAY_MS);
		return effectiveNow >= overdueStart && effectiveNow <= overdueEnd;
	}

	if (recurrence.frequency === 'yearly') {
		const dueDate = mostRecentYearlyDate(recurrence.month, recurrence.day, effectiveNow);
		const dueIso = isoDate(dueDate);
		if (hasCompletionOnDate(history, dueIso, taskId, taskName)) return false;
		const overdueStart = new Date(endOfDay(dueDate).getTime() + monthlyGraceHours * 60 * 60 * 1000);
		const overdueEnd = new Date(overdueStart.getTime() + monthlyVisibleDays * DAY_MS);
		return effectiveNow >= overdueStart && effectiveNow <= overdueEnd;
	}

	return false;
}
