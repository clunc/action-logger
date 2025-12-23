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
};

export type StretchTemplate = {
	name: string;
	defaultDurationSeconds: number;
	holdLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
};

export type PillarEmojiMap = Record<string, string>;

export type TaskCategory = 'operational' | 'retrospective' | 'strategic';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type WeekdayAbbrev = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type RecurrenceRule =
	| { frequency: 'daily' }
	| { frequency: 'weekly'; days?: WeekdayAbbrev[] }
	| { frequency: 'monthly'; day_of_month?: number };

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
