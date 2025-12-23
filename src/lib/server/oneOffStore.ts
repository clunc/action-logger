import { promises as fs } from 'fs';
import path from 'path';
import type { OneOffTask, OneOffTaskTemplate, TaskCategory } from '$lib/types';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const FALLBACK_DATA_DIR = path.join(process.cwd(), '.data-fallback');
const JSON_FILE = path.join(FALLBACK_DATA_DIR, 'one_offs.json');

let Database: any = null;
let sqliteLoadError: unknown = null;

(async () => {
	try {
		const mod = await import('better-sqlite3');
		Database = (mod as any).default ?? mod;
	} catch (error) {
		sqliteLoadError = error;
		console.error('oneOffStore: better-sqlite3 unavailable, using JSON store', error);
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
		console.error('oneOffStore: primary data dir failed, using fallback', error);
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
		CREATE TABLE IF NOT EXISTS one_offs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			type TEXT NOT NULL,
			pipeline TEXT NOT NULL,
			pillar TEXT NOT NULL,
			scheduled_for TEXT NOT NULL,
			time_block TEXT,
			priority INTEGER,
			context TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
	return db;
}

async function readJson(): Promise<OneOffTask[]> {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		const raw = await fs.readFile(JSON_FILE, 'utf8').catch(() => '[]');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as OneOffTask[]) : [];
	} catch (error) {
		console.error('oneOffStore: JSON read failed', error);
		return [];
	}
}

async function writeJson(entries: OneOffTask[]) {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		await fs.writeFile(JSON_FILE, JSON.stringify(entries, null, 2), 'utf8');
	} catch (error) {
		console.error('oneOffStore: JSON write failed', error);
	}
}

function assertTaskCategory(value: unknown, label: string): TaskCategory {
	if (value === 'operational' || value === 'retrospective' || value === 'strategic') return value;
	throw new Error(`${label} must be one of operational, retrospective, strategic`);
}

function assertDate(value: unknown, label: string): string {
	if (typeof value !== 'string') {
		throw new Error(`${label} must be a YYYY-MM-DD string`);
	}
	const trimmed = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		throw new Error(`${label} must be in YYYY-MM-DD format`);
	}
	return trimmed;
}

function normalizeOneOff(input: Partial<OneOffTaskTemplate>, label: string): OneOffTaskTemplate {
	const { title, type, pipeline, pillar, scheduled_for, time_block, priority, context, notes } = input;

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
	const scheduledFor = assertDate(scheduled_for, `${label}: scheduled_for`);

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
		scheduled_for: scheduledFor,
		time_block: typeof time_block === 'string' ? time_block.trim() : undefined,
		priority: priorityNum,
		context: typeof context === 'string' ? context.trim() : undefined,
		notes: typeof notes === 'string' ? notes.trim() : undefined
	};
}

export async function listOneOffs(date?: string): Promise<OneOffTask[]> {
	if (!Database) {
		const all = await readJson();
		return date ? all.filter((entry) => entry.scheduled_for === date) : all;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const rows = db
			.prepare(
				`SELECT id, title, type, pipeline, pillar, scheduled_for, time_block, priority, context, notes, created_at
				 FROM one_offs
				 ${date ? 'WHERE scheduled_for = @date' : ''}
				 ORDER BY scheduled_for ASC, priority DESC, created_at ASC`
			)
			.all(date ? { date } : {});
		db.close();
		return rows as OneOffTask[];
	} catch (error) {
		console.error('oneOffStore: failed to read one-offs', error);
		const all = await readJson();
		return date ? all.filter((entry) => entry.scheduled_for === date) : all;
	}
}

export async function createOneOff(input: Partial<OneOffTaskTemplate>): Promise<OneOffTask> {
	const normalized = normalizeOneOff(input, 'One-off');

	if (!Database) {
		const all = await readJson();
		const id = all.length ? Math.max(...all.map((t) => t.id ?? 0)) + 1 : 1;
		const created_at = new Date().toISOString();
		const record: OneOffTask = { ...normalized, id, created_at };
		await writeJson([record, ...all]);
		return record;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const stmt = db.prepare(`
			INSERT INTO one_offs (title, type, pipeline, pillar, scheduled_for, time_block, priority, context, notes)
			VALUES (@title, @type, @pipeline, @pillar, @scheduled_for, @time_block, @priority, @context, @notes)
		`);
		const result = stmt.run(normalized);
		const row = db
			.prepare(
				`SELECT id, title, type, pipeline, pillar, scheduled_for, time_block, priority, context, notes, created_at
				 FROM one_offs WHERE id = ?`
			)
			.get(result.lastInsertRowid);
		db.close();
		return row as OneOffTask;
	} catch (error) {
		console.error('oneOffStore: failed to create one-off', error);
		const all = await readJson();
		const id = all.length ? Math.max(...all.map((t) => t.id ?? 0)) + 1 : 1;
		const created_at = new Date().toISOString();
		const record: OneOffTask = { ...normalized, id, created_at };
		await writeJson([record, ...all]);
		return record;
	}
}

export function getOneOffBackendStatus() {
	return {
		sqliteAvailable: Boolean(Database),
		sqliteLoadError
	};
}
