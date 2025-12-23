export type HistoryEntry = {
	task: string;
	subtaskNumber: number;
	durationSeconds: number;
	timestamp: string;
};

export type SubtaskEntry = {
	subtaskNumber: number;
	durationSeconds: number;
	completed: boolean;
	timestamp: string | null;
};

export type SessionTask = {
	name: string;
	subtasks: SubtaskEntry[];
	defaultDurationSeconds: number;
	subtaskLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
	priority?: number;
	recurrence?: RecurrenceRule;
};

export type TaskTemplate = {
	name: string;
	defaultDurationSeconds: number;
	subtaskLabels?: string[];
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

// Backwards-compatible aliases for legacy imports
export type StretchTemplate = TaskTemplate;
export type SessionStretch = SessionTask;
export type HoldEntry = SubtaskEntry;
