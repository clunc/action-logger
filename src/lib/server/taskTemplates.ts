import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { RecurringTaskTemplate, RecurrenceRule, TaskCategory, WeekdayAbbrev } from '$lib/types';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const RECURRING_FILE = path.join(DATA_DIR, 'recurring.yaml');
const RECURRING_EXAMPLE_FILE = path.join(DATA_DIR, 'recurring.example.yaml');

type RecurringYamlDoc = { recurring?: unknown };

const RECURRING_EXAMPLE_CONTENT = `# Defines recurring tasks. Copy to recurring.yaml to customize.
recurring:
  - title: Morning Weight Check
    type: operational
    pipeline: body_comp
    pillar: physical_health
    recurrence:
      frequency: daily
    time_block: "06:30–06:35"
    priority: 8
    context: smart_scale
    notes: "Record weight and body fat %"

  - title: Mobility Flow
    type: operational
    pipeline: mobility
    pillar: physical_health
    recurrence:
      frequency: daily
    time_block: "19:30–19:50"
    priority: 7
    context: mobility_logger
    notes: "Hip and shoulder mobility"

  - title: Weekly Review
    type: retrospective
    pipeline: self_reflection
    pillar: mental_clarity
    recurrence:
      frequency: weekly
      days: [Sun]
    time_block: "20:00–20:45"
    priority: 9
    notes: "Review progress on all pillars and set adjustments"

  - title: Monthly Strategy Session
    type: strategic
    pipeline: personal_strategy
    pillar: purpose
    recurrence:
      frequency: monthly
      day_of_month: 1
    time_block: "15:00–16:30"
    priority: 8
    notes: "Plan new goals, refine pipelines"
`;

async function ensureExampleFiles() {
	await fs.mkdir(DATA_DIR, { recursive: true });

	const writes: Promise<void>[] = [];

	writes.push(
		fs.access(RECURRING_EXAMPLE_FILE).catch(() => fs.writeFile(RECURRING_EXAMPLE_FILE, RECURRING_EXAMPLE_CONTENT, 'utf8'))
	);

	await Promise.all(writes);
}

async function readYaml(pathToFile: string, fallbackPath: string, fallbackContent: string) {
	await ensureExampleFiles();

	const raw = await fs
		.readFile(pathToFile, 'utf8')
		.catch(async () => fs.readFile(fallbackPath, 'utf8').catch(() => fallbackContent));

	return YAML.parse(raw);
}

function assertTaskCategory(value: unknown, label: string): TaskCategory {
	if (value === 'operational' || value === 'retrospective' || value === 'strategic') return value;
	throw new Error(`${label} must be one of operational, retrospective, strategic`);
}

function assertWeekdayArray(value: unknown, label: string): WeekdayAbbrev[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) {
		throw new Error(`${label} must be an array of weekdays (e.g., [Mon, Tue])`);
	}

	const allowed: WeekdayAbbrev[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const cleaned = value.map((v) => String(v)).filter((v) => allowed.includes(v as WeekdayAbbrev)) as WeekdayAbbrev[];
	if (!cleaned.length) return undefined;
	return cleaned;
}

function validateRecurrence(rule: unknown, taskTitle: string): RecurrenceRule {
	if (!rule || typeof rule !== 'object') {
		throw new Error(`Task "${taskTitle}" must include a recurrence object`);
	}

	const { frequency, days, day_of_month } = rule as Record<string, unknown>;

	if (frequency === 'daily') {
		return { frequency: 'daily' };
	}

	if (frequency === 'weekly') {
		const weekdayList = assertWeekdayArray(days, `Task "${taskTitle}" weekly.days`);
		return weekdayList?.length ? { frequency: 'weekly', days: weekdayList } : { frequency: 'weekly' };
	}

	if (frequency === 'monthly') {
		if (day_of_month === undefined) {
			return { frequency: 'monthly' };
		}
		const dayNum = Number(day_of_month);
		if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
			throw new Error(`Task "${taskTitle}" monthly.day_of_month must be an integer between 1-31`);
		}
		return { frequency: 'monthly', day_of_month: dayNum };
	}

	throw new Error(`Task "${taskTitle}" has unsupported frequency "${frequency}"`);
}

function validateRecurringDoc(doc: RecurringYamlDoc): RecurringTaskTemplate[] {
	const entries = doc.recurring;
	if (!Array.isArray(entries)) return [];

	return entries.map((entry, idx) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`Recurring entry ${idx + 1} is not an object`);
		}

		const { title, type, pipeline, pillar, recurrence, time_block, priority, context, notes } = entry as Record<
			string,
			unknown
		>;

		if (typeof title !== 'string' || !title.trim()) {
			throw new Error(`Recurring entry ${idx + 1} is missing a title`);
		}

		const taskType = assertTaskCategory(type, `Recurring entry "${title}" type`);
		if (typeof pipeline !== 'string' || !pipeline.trim()) {
			throw new Error(`Recurring entry "${title}" is missing a pipeline`);
		}
		if (typeof pillar !== 'string' || !pillar.trim()) {
			throw new Error(`Recurring entry "${title}" is missing a pillar`);
		}

		const recurrenceRule = validateRecurrence(recurrence, title);

		const priorityNum = priority === undefined ? undefined : Number(priority);
		if (
			priority !== undefined &&
			(priorityNum === undefined || !Number.isInteger(priorityNum) || priorityNum < 0)
		) {
			throw new Error(`Recurring entry "${title}" priority must be a non-negative integer`);
		}

		return {
			title: title.trim(),
			type: taskType,
			pipeline: pipeline.trim(),
			pillar: pillar.trim(),
			recurrence: recurrenceRule,
			time_block: typeof time_block === 'string' ? time_block.trim() : undefined,
			priority: priorityNum,
			context: typeof context === 'string' ? context.trim() : undefined,
			notes: typeof notes === 'string' ? notes.trim() : undefined
		};
	});
}

export async function loadRecurringTemplates(): Promise<RecurringTaskTemplate[]> {
	const doc = (await readYaml(RECURRING_FILE, RECURRING_EXAMPLE_FILE, RECURRING_EXAMPLE_CONTENT)) as RecurringYamlDoc;
	return validateRecurringDoc(doc);
}

export async function getTaskTemplateVersions() {
	const recurringStats = await fs.stat(RECURRING_FILE).catch(() => fs.stat(RECURRING_EXAMPLE_FILE).catch(() => null));
	return { recurringVersion: recurringStats?.mtimeMs ?? null };
}
