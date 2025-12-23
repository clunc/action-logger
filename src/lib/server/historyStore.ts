import { promises as fs } from 'fs';
import path from 'path';
import type { HistoryEntry } from '$lib/types';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const FALLBACK_DATA_DIR = path.join(process.cwd(), '.data-fallback');
const JSON_FILE = path.join(FALLBACK_DATA_DIR, 'history.json');

let Database: any = null;
let sqliteLoadError: unknown = null;

// Try to load the native driver at startup. If it fails (platform restrictions),
// we fall back to a JSON file store so the app keeps working.
(async () => {
	try {
		const mod = await import('better-sqlite3');
		Database = (mod as any).default ?? mod;
	} catch (error) {
		sqliteLoadError = error;
		console.error('historyStore: better-sqlite3 unavailable, using JSON store', error);
	}
})();

function getDataPaths() {
	const baseDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : DEFAULT_DATA_DIR;
	return {
		dir: baseDir,
		dbFile: path.join(baseDir, 'stretch.db')
	};
}

async function ensureDbFile() {
	const primary = getDataPaths();
	try {
		await fs.mkdir(primary.dir, { recursive: true });
		await fs.access(primary.dbFile).catch(async () => {
			await fs.writeFile(primary.dbFile, '');
		});
		return primary;
	} catch (error) {
		console.error('historyStore: primary data dir failed, using fallback', error);
		const fallback = { dir: FALLBACK_DATA_DIR, dbFile: path.join(FALLBACK_DATA_DIR, 'stretch.db') };
		await fs.mkdir(fallback.dir, { recursive: true });
		await fs.access(fallback.dbFile).catch(async () => {
			await fs.writeFile(fallback.dbFile, '');
		});
		return fallback;
	}
}

function initDb(dbFile: string) {
	if (!Database) {
		throw new Error('Database driver not loaded');
	}

	const db = new Database(dbFile);
	db.pragma('journal_mode = WAL');
	db.exec(`
		CREATE TABLE IF NOT EXISTS history (
			stretch TEXT NOT NULL,
			holdNumber INTEGER NOT NULL,
			durationSeconds INTEGER NOT NULL,
			timestamp TEXT NOT NULL,
			PRIMARY KEY (stretch, holdNumber, timestamp)
		)
	`);
	return db;
}

async function readHistoryJson(): Promise<HistoryEntry[]> {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		const raw = await fs.readFile(JSON_FILE, 'utf8').catch(() => '[]');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed)
			? (parsed as any[]).map((entry) => ({
					task: (entry as any).task ?? (entry as any).stretch ?? '',
					subtaskNumber:
						typeof (entry as any).subtaskNumber === 'number'
							? (entry as any).subtaskNumber
							: Number((entry as any).holdNumber) || 0,
					durationSeconds: Number((entry as any).durationSeconds) || 0,
					timestamp: String((entry as any).timestamp ?? '')
				}))
			: [];
	} catch (error) {
		console.error('historyStore: JSON read failed', error);
		return [];
	}
}

async function writeHistoryJson(entries: HistoryEntry[]) {
	try {
		await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
		await fs.writeFile(JSON_FILE, JSON.stringify(entries, null, 2), 'utf8');
	} catch (error) {
		console.error('historyStore: JSON write failed', error);
	}
}

export async function readHistory(): Promise<HistoryEntry[]> {
	if (!Database) {
		return readHistoryJson();
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const rows = db
			.prepare(
				`SELECT stretch as task, holdNumber as subtaskNumber, durationSeconds, timestamp FROM history ORDER BY datetime(timestamp) DESC`
			)
			.all();
		db.close();
		return rows as HistoryEntry[];
	} catch (error) {
		console.error('historyStore: failed to read history', error);
		return readHistoryJson();
	}
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
	if (!Database) {
		const current = await readHistoryJson();
		await writeHistoryJson([...entries, ...current]);
		return;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const insert = db.prepare(
			`INSERT INTO history (stretch, holdNumber, durationSeconds, timestamp) VALUES (@stretch, @holdNumber, @durationSeconds, @timestamp)`
		);

		const transaction = db.transaction((toInsert: HistoryEntry[]) => {
			for (const entry of toInsert) {
				insert.run({
					stretch: entry.task,
					holdNumber: entry.subtaskNumber,
					durationSeconds: entry.durationSeconds,
					timestamp: entry.timestamp
				});
			}
		});

		transaction(entries);
		db.close();
	} catch (error) {
		console.error('historyStore: failed to append history', error);
	}
}

export async function replaceHistory(entries: HistoryEntry[]): Promise<void> {
	if (!Database) {
		await writeHistoryJson(entries);
		return;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);
		const insert = db.prepare(
			`INSERT INTO history (stretch, holdNumber, durationSeconds, timestamp) VALUES (@stretch, @holdNumber, @durationSeconds, @timestamp)`
		);

		const transaction = db.transaction((toInsert: HistoryEntry[]) => {
			db.prepare(`DELETE FROM history`).run();
			for (const entry of toInsert) {
				insert.run({
					stretch: entry.task,
					holdNumber: entry.subtaskNumber,
					durationSeconds: entry.durationSeconds,
					timestamp: entry.timestamp
				});
			}
		});

		transaction(entries);
		db.close();
	} catch (error) {
		console.error('historyStore: failed to replace history', error);
	}
}

export async function deleteTodayEntry({
	task,
	subtaskNumber,
	timestamp
}: {
	task: string;
	subtaskNumber: number;
	timestamp: string;
}): Promise<number> {
	if (!Database) {
		const all = await readHistoryJson();
		const filtered = all.filter(
			(entry) =>
				!(
					entry.task === task &&
					entry.subtaskNumber === subtaskNumber &&
					entry.timestamp === timestamp
				)
		);
		await writeHistoryJson(filtered);
		return all.length - filtered.length;
	}

	try {
		const paths = await ensureDbFile();
		const db = initDb(paths.dbFile);

		const stmt = db.prepare(
			`DELETE FROM history WHERE stretch = ? AND holdNumber = ? AND timestamp = ?`
		);
		const result = stmt.run(task, subtaskNumber, timestamp);
		db.close();

		return result.changes ?? 0;
	} catch (error) {
		console.error('historyStore: failed to delete entry', error);
		return 0;
	}
}

export function getHistoryBackendStatus() {
	return {
		sqliteAvailable: Boolean(Database),
		sqliteLoadError
	};
}
