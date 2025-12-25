import { promises as fs } from 'fs';
import path from 'path';
import type { RecurrenceRule, RecurringTask, RecurringTaskTemplate, TaskCategory, WeekdayAbbrev } from '$lib/types';
import { DEFAULT_DATA_DIR, FALLBACK_DATA_DIR } from '$lib/env';
const JSON_FILE = path.join(FALLBACK_DATA_DIR, 'recurring.json');

let Database: any = null;
let sqliteLoadError: unknown = null;

(async () => {
	try {
		const mod = await import('better-sqlite3');
		Database = (mod as any).default ?? mod;
	} catch (error) {
		sqliteLoadError = error;
		console.error('recurringStore: better-sqlite3 unavailable, using JSON store', error);
	}
})();

function getDataPaths() {
	const baseDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : DEFAULT_DATA_DIR;
	return {
		dir: baseDir,
		dbFile: path.join(baseDir, 'actions.db'),
		legacyDbFile: path.join(baseDir, 'stretch.db')
	};
}

async function ensureDbFile() {
	const primary = getDataPaths();
	try {
		await fs.mkdir(primary.dir, { recursive: true });
		const targetFile = await fs
			.access(primary.legacyDbFile)
			.then(() => primary.legacyDbFile)
			.catch(async () => {
				await fs.access(primary.dbFile).catch(async () => {
					await fs.writeFile(primary.dbFile, '');
				});
				return primary.dbFile;
			});
		return { dir: primary.dir, dbFile: targetFile };
	} catch (error) {
		console.error('recurringStore: primary data dir failed, using fallback', error);
		const fallbackLegacy = path.join(FALLBACK_DATA_DIR, 'stretch.db');
		const fallback = { dir: FALLBACK_DATA_DIR, dbFile: path.join(FALLBACK_DATA_DIR, 'actions.db') };
		await fs.mkdir(fallback.dir, { recursive: true });
		const targetFile = await fs
			.access(fallbackLegacy)
			.then(() => fallbackLegacy)
			.catch(async () => {
				await fs.access(fallback.dbFile).catch(async () => {
					await fs.writeFile(fallback.dbFile, '');
				});
				return fallback.dbFile;
			});
		return { dir: fallback.dir, dbFile: targetFile };
	}
}

function initDb(dbFile: string) {
	if (!Database) {
		throw new Error('Database driver not loaded');
	}

	const db = new Database(dbFile);
	db.pragma('journal_mode = WAL');
	db.exec(`
		CREATE TABLE IF NOT EXISTS recurring_tasks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			type TEXT NOT NULL,
			pipeline TEXT NOT NULL,
			pillar TEXT NOT NULL,
			recurrence_frequency TEXT NOT NULL,
			recurrence_days TEXT,
			recurrence_day_of_month INTEGER,
			recurrence_month INTEGER,
			recurrence_day INTEGER,
			time_block TEXT,
			priority INTEGER,
			context TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
	return db;
}

async function readJson(): Promise<RecurringTask[]> {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		const raw = await fs.readFile(JSON_FILE, 'utf8').catch(() => '[]');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as RecurringTask[]) : [];
	} catch (error) {
		console.error('recurringStore: JSON read failed', error);
		return [];
	}
}

async function writeJson(entries: RecurringTask[]) {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		await fs.writeFile(JSON_FILE, JSON.stringify(entries, null, 2), 'utf8');
	} catch (error) {
		console.error('recurringStore: JSON write failed', error);
	}
}

function assertTaskCategory(value: unknown, label: string): TaskCategory {
	if (value === 'operational' || value === 'retrospective' || value === 'strategic') return value;
	throw new Error(`${label} must be one of operational, retrospective, strategic`);
}

function assertRecurrence(value: unknown, label: string): RecurrenceRule {
	if (!value || typeof value !== 'object') return { frequency: 'daily' };
	const { frequency, days, day_of_month, month, day } = value as Record<string, unknown>;

	if (frequency === 'weekly') {
		const allowed: WeekdayAbbrev[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const list = Array.isArray(days)
			? (days
					.map((d) => String(d).trim())
					.filter((d) => allowed.includes(d as WeekdayAbbrev)) as WeekdayAbbrev[])
			: [];
		return { frequency: 'weekly', days: list.length ? list : undefined };
	}

	if (frequency === 'monthly') {
		const dom = Number(day_of_month);
		return Number.isInteger(dom) && dom >= 1 && dom <= 31 ? { frequency: 'monthly', day_of_month: dom } : { frequency: 'monthly' };
	}

	if (frequency === 'yearly') {
		const monthNum = Number(month);
		const dayNum = Number(day);
		const validMonth = Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : undefined;
		const validDay = Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 ? dayNum : undefined;
		return { frequency: 'yearly', month: validMonth, day: validDay };
	}

	return { frequency: 'daily' };
}

function normalizeRecurring(input: Partial<RecurringTaskTemplate>, label: string): RecurringTaskTemplate {
	const { title, type, pipeline, pillar, recurrence, time_block, priority, context, notes } = input;

	if (typeof title !== 'string' || !title.trim()) {
		throw new Error(`${label}: title is required`);
	}
	if (typeof pipeline !== 'string' || !pipeline.trim()) {
		throw new Error(`${label}: pipeline is required`);
	}
	if (typeof pillar !== 'string' || !pillar.trim()) {
		throw new Error(`${label}: pillar is required`);
	}

	const taskType = assertTaskCategory(type, `${label}: type`);
	const normalizedRecurrence = assertRecurrence(recurrence, `${label}: recurrence`);

	let priorityNum: number | undefined;
	if (priority !== undefined) {
		const parsed = Number(priority);
		if (!Number.isInteger(parsed) || parsed < 0) {
			throw new Error(`${label}: priority must be a non-negative integer`);
		}
		priorityNum = parsed;
	}

	return {
		title: title.trim(),
		type: taskType,
		pipeline: pipeline.trim(),
		pillar: pillar.trim(),
		recurrence: normalizedRecurrence,
		time_block: typeof time_block === 'string' ? time_block.trim() : undefined,
		priority: priorityNum,
		context: typeof context === 'string' ? context.trim() : undefined,
		notes: typeof notes === 'string' ? notes.trim() : undefined
	};
}

export async function listRecurringTasks(): Promise<RecurringTask[]> {
	if (!Database) {
		return readJson();
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const rows = db
			.prepare(
				`SELECT id, title, type, pipeline, pillar, recurrence_frequency, recurrence_days, recurrence_day_of_month, recurrence_month, recurrence_day, time_block, priority, context, notes, created_at
				 FROM recurring_tasks
				 ORDER BY (priority IS NULL), priority DESC, created_at ASC`
			)
			.all();
		db.close();
		return (rows as any[]).map((row) => {
			const recurrence: RecurrenceRule =
				row.recurrence_frequency === 'weekly'
					? { frequency: 'weekly', days: row.recurrence_days ? JSON.parse(row.recurrence_days) : undefined }
					: row.recurrence_frequency === 'monthly'
						? { frequency: 'monthly', day_of_month: row.recurrence_day_of_month ?? undefined }
						: row.recurrence_frequency === 'yearly'
							? { frequency: 'yearly', month: row.recurrence_month ?? undefined, day: row.recurrence_day ?? undefined }
							: { frequency: 'daily' };

			return {
				id: row.id,
				title: row.title,
				type: row.type,
				pipeline: row.pipeline,
				pillar: row.pillar,
				recurrence,
				time_block: row.time_block ?? undefined,
				priority: row.priority ?? undefined,
				context: row.context ?? undefined,
				notes: row.notes ?? undefined,
				created_at: row.created_at
			} as RecurringTask;
		});
	} catch (error) {
		console.error('recurringStore: failed to read recurring tasks', error);
		return readJson();
	}
}

export async function createRecurringTask(input: Partial<RecurringTaskTemplate>): Promise<RecurringTask> {
	const normalized = normalizeRecurring(input, 'Recurring');

	if (!Database) {
		const all = await readJson();
		const id = all.length ? Math.max(...all.map((t) => t.id ?? 0)) + 1 : 1;
		const created_at = new Date().toISOString();
		const record: RecurringTask = { ...normalized, id, created_at };
		await writeJson([...all, record]);
		return record;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const stmt = db.prepare(`
			INSERT INTO recurring_tasks (
				title, type, pipeline, pillar, recurrence_frequency, recurrence_days, recurrence_day_of_month, recurrence_month, recurrence_day, time_block, priority, context, notes
			) VALUES (
				@title, @type, @pipeline, @pillar, @recurrence_frequency, @recurrence_days, @recurrence_day_of_month, @recurrence_month, @recurrence_day, @time_block, @priority, @context, @notes
			)
		`);

		const recurrence = normalized.recurrence;
		const params = {
			title: normalized.title,
			type: normalized.type,
			pipeline: normalized.pipeline,
			pillar: normalized.pillar,
			recurrence_frequency: recurrence.frequency,
			recurrence_days: recurrence.frequency === 'weekly' && recurrence.days ? JSON.stringify(recurrence.days) : null,
			recurrence_day_of_month: recurrence.frequency === 'monthly' ? recurrence.day_of_month ?? null : null,
			recurrence_month: recurrence.frequency === 'yearly' ? recurrence.month ?? null : null,
			recurrence_day: recurrence.frequency === 'yearly' ? recurrence.day ?? null : null,
			time_block: normalized.time_block ?? null,
			priority: normalized.priority ?? null,
			context: normalized.context ?? null,
			notes: normalized.notes ?? null
		};

		const result = stmt.run(params);
		const row = db
			.prepare(
				`SELECT id, title, type, pipeline, pillar, recurrence_frequency, recurrence_days, recurrence_day_of_month, recurrence_month, recurrence_day, time_block, priority, context, notes, created_at
				 FROM recurring_tasks WHERE id = ?`
			)
			.get(result.lastInsertRowid);
		db.close();

		const recurrenceFromRow: RecurrenceRule =
			row.recurrence_frequency === 'weekly'
				? { frequency: 'weekly', days: row.recurrence_days ? JSON.parse(row.recurrence_days) : undefined }
				: row.recurrence_frequency === 'monthly'
					? { frequency: 'monthly', day_of_month: row.recurrence_day_of_month ?? undefined }
					: row.recurrence_frequency === 'yearly'
						? { frequency: 'yearly', month: row.recurrence_month ?? undefined, day: row.recurrence_day ?? undefined }
						: { frequency: 'daily' };

		return {
			id: row.id,
			title: row.title,
			type: row.type,
			pipeline: row.pipeline,
			pillar: row.pillar,
			recurrence: recurrenceFromRow,
			time_block: row.time_block ?? undefined,
			priority: row.priority ?? undefined,
			context: row.context ?? undefined,
			notes: row.notes ?? undefined,
			created_at: row.created_at
		} as RecurringTask;
	} catch (error) {
		console.error('recurringStore: failed to create recurring task', error);
		const all = await readJson();
		const id = all.length ? Math.max(...all.map((t) => t.id ?? 0)) + 1 : 1;
		const created_at = new Date().toISOString();
		const record: RecurringTask = { ...normalized, id, created_at };
		await writeJson([...all, record]);
		return record;
	}
}

export async function deleteRecurringById(id: number): Promise<number> {
	if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid id');

	if (!Database) {
		const all = await readJson();
		const filtered = all.filter((entry) => entry.id !== id);
		await writeJson(filtered);
		return all.length - filtered.length;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const stmt = db.prepare(`DELETE FROM recurring_tasks WHERE id = ?`);
		const result = stmt.run(id);
		db.close();
		return result.changes ?? 0;
	} catch (error) {
		console.error('recurringStore: failed to delete recurring task', error);
		const all = await readJson();
		const filtered = all.filter((entry) => entry.id !== id);
		await writeJson(filtered);
		return all.length - filtered.length;
	}
}

export function getRecurringBackendStatus() {
	return {
		sqliteAvailable: Boolean(Database),
		sqliteLoadError
	};
}
