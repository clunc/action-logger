export type HistoryEntry = {
	stretch: string;
	holdNumber: number;
	durationSeconds: number;
	timestamp: string;
};

export type HoldEntry = {
	holdNumber: number;
	durationSeconds: number;
	completed: boolean;
	timestamp: string | null;
};

export type SessionStretch = {
	name: string;
	holds: HoldEntry[];
	defaultDurationSeconds: number;
	holdLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
	priority?: number;
	recurrence?: RecurrenceRule;
};

export type StretchTemplate = {
	name: string;
	defaultDurationSeconds: number;
	holdLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
	priority?: number;
	recurrence?: RecurrenceRule;
};

export type PillarEmojiMap = Record<string, string>;

export type WeekdayAbbrev = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export type RecurrenceRule =
	| { frequency: 'daily' }
	| { frequency: 'weekly'; days?: WeekdayAbbrev[] }
	| { frequency: 'monthly'; day_of_month?: number }
	| { frequency: 'yearly'; month?: number; day?: number };

export type TaskCategory = 'operational' | 'retrospective' | 'strategic';

export type RecurringTaskTemplate = {
	title: string;
	type: TaskCategory;
	pipeline: string;
	pillar: string;
	recurrence: RecurrenceRule;
	time_block?: string;
	priority?: number;
	context?: string;
	notes?: string;
};

export type OneOffTaskTemplate = {
	title: string;
	type: TaskCategory;
	pipeline: string;
	pillar: string;
	scheduled_for: string; // YYYY-MM-DD
	time_block?: string;
	priority?: number;
	context?: string;
	notes?: string;
};

export type OneOffTask = OneOffTaskTemplate & {
	id: number;
	created_at: string;
};
