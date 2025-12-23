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
};

export type StretchTemplate = {
	name: string;
	defaultDurationSeconds: number;
	holdLabels?: string[];
};
