export type HistoryEntry = {
	taskId?: string | null;
	task: string;
	subtaskNumber: number;
	durationSeconds: number;
	timestamp: string;
	status?: 'done' | 'skipped' | 'in-progress';
	occurrenceDate?: string;
};

export type SubtaskEntry = {
	subtaskNumber: number;
	durationSeconds: number;
	completed: boolean;
	timestamp: string | null;
	startedAt?: string | null;
	status?: 'pending' | 'in-progress' | 'done' | 'skipped';
};

export type SessionTask = {
	name: string;
	id?: string;
	pipeline?: string;
	subtasks: SubtaskEntry[];
	defaultDurationSeconds: number;
	subtaskLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
	priority?: number;
	time_block?: string;
	context?: string;
	notes?: string;
	type?: TaskCategory;
	recurrence?: RecurrenceRule;
	isOneOff?: boolean;
	oneOffId?: number;
	dueDate?: string;
};

export type TaskTemplate = {
	name: string;
	id?: string;
	pipeline?: string;
	defaultDurationSeconds: number;
	subtaskLabels?: string[];
	pillar?: string;
	pillarEmoji?: string;
	priority?: number;
	time_block?: string;
	context?: string;
	notes?: string;
	type?: TaskCategory;
	recurrence?: RecurrenceRule;
	isOneOff?: boolean;
	oneOffId?: number;
	dueDate?: string;
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

export type RecurringTask = RecurringTaskTemplate & {
	id: number;
	created_at: string;
};

// Backwards-compatible aliases for legacy imports
export type StretchTemplate = TaskTemplate;
export type SessionStretch = SessionTask;
export type HoldEntry = SubtaskEntry;
