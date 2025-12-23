import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { PillarEmojiMap, StretchTemplate, WeekdayAbbrev, RecurrenceRule } from '$lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TODOS_FILE = path.join(DATA_DIR, 'todos.yaml');
const STRETCHES_FILE = path.join(DATA_DIR, 'stretches.yaml'); // kept for backward compatibility
const PILLARS_FILE = path.join(DATA_DIR, 'pillars.yaml');
const PILLARS_EXAMPLE_FILE = path.join(DATA_DIR, 'pillars.example.yaml');

let cachedTemplate: { mtimeMs: number; value: StretchTemplate[]; file: string } | null = null;

const DEFAULT_PILLAR_EMOJIS: PillarEmojiMap = {
	planning: '🧭',
	operations: '🛠️',
	focus: '🎯',
	recovery: '🌿',
	physical_health: '💪',
	mental_clarity: '🧠',
	purpose: '✨',
	stability: '💼',
	mobility: '🤸',
	career: '💼',
	finances: '💰',
	health: '💪',
	learning: '📚',
	relationships: '❤️'
};

async function ensurePillarsExample() {
	await fs
		.access(PILLARS_EXAMPLE_FILE)
		.catch(() =>
			fs.writeFile(
				PILLARS_EXAMPLE_FILE,
				`# Map pillar names to emojis. Keys are case-insensitive.\n` +
					`pillars:\n` +
					Object.entries(DEFAULT_PILLAR_EMOJIS)
						.map(([key, emoji]) => `  ${key}: "${emoji}"`)
						.join('\n') +
					'\n',
				'utf8'
			)
		);
}

async function loadPillarEmojiMap(): Promise<{ map: PillarEmojiMap; version: number | null }> {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await ensurePillarsExample();

	let sourcePath: string | null = null;
	let version: number | null = null;

	const primary = await fs
		.stat(PILLARS_FILE)
		.then((stats) => {
			sourcePath = PILLARS_FILE;
			version = stats.mtimeMs;
			return fs.readFile(PILLARS_FILE, 'utf8');
		})
		.catch(() => null);

	const raw =
		primary ??
		(await fs
			.stat(PILLARS_EXAMPLE_FILE)
			.then((stats) => {
				sourcePath = PILLARS_EXAMPLE_FILE;
				version = stats.mtimeMs;
				return fs.readFile(PILLARS_EXAMPLE_FILE, 'utf8');
			})
			.catch(() => null));

	if (!raw) {
		return { map: { ...DEFAULT_PILLAR_EMOJIS }, version: null };
	}

	const parsed = YAML.parse(raw) as { pillars?: unknown };
	const incoming = parsed?.pillars;
	if (!incoming || typeof incoming !== 'object') {
		return { map: { ...DEFAULT_PILLAR_EMOJIS }, version };
	}

	const entries = Object.entries(incoming as Record<string, unknown>).filter(
		([, v]) => typeof v === 'string' && (v as string).trim()
	);

	if (!entries.length) {
		return { map: { ...DEFAULT_PILLAR_EMOJIS }, version };
	}

	const map: PillarEmojiMap = {};
	for (const [key, emoji] of entries) {
		map[key.toLowerCase()] = (emoji as string).trim();
	}

	return { map: { ...DEFAULT_PILLAR_EMOJIS, ...map }, version };
}

function normalizeLabels(labels: unknown): string[] | undefined {
	if (!Array.isArray(labels)) return undefined;
	const cleaned = labels.map((label) => (typeof label === 'string' ? label.trim() : '')).filter(Boolean);
	return cleaned.length ? cleaned : undefined;
}

function normalizeRecurrence(raw: unknown, name: string): RecurrenceRule {
	if (!raw || typeof raw !== 'object') {
		return { frequency: 'daily' };
	}

	const { frequency, days, day_of_month, month, day } = raw as Record<string, unknown>;

	if (frequency === 'weekly') {
		const allowed: WeekdayAbbrev[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const dayList = Array.isArray(days)
			? (days
					.map((d) => String(d).trim())
					.filter((d) => allowed.includes(d as WeekdayAbbrev)) as WeekdayAbbrev[])
			: undefined;
		return { frequency: 'weekly', days: dayList?.length ? dayList : undefined };
	}

	if (frequency === 'monthly') {
		const dom = Number(day_of_month);
		if (Number.isInteger(dom) && dom >= 1 && dom <= 31) {
			return { frequency: 'monthly', day_of_month: dom };
		}
		return { frequency: 'monthly' };
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

function validateTemplate(raw: unknown, fileName: string, pillarEmojiMap: PillarEmojiMap): StretchTemplate[] {
	if (!Array.isArray(raw)) {
		throw new Error(`${fileName} must be an array of todos`);
	}

	const seen = new Set<string>();

	return raw.map((entry, idx) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`${fileName} entry ${idx + 1} is not an object`);
		}

		const { name, defaultDurationSeconds, holdLabels, pillar, pillarEmoji, pillar_emoji, priority, recurrence } =
			entry as Record<string, unknown>;

		if (typeof name !== 'string' || !name.trim()) {
			throw new Error(`${fileName} entry ${idx + 1} is missing a valid name`);
		}

		if (typeof defaultDurationSeconds !== 'number' || !Number.isFinite(defaultDurationSeconds)) {
			throw new Error(`${fileName} entry "${name}" is missing a numeric defaultDurationSeconds`);
		}

		if (seen.has(name)) {
			throw new Error(`${fileName} contains duplicate todo name "${name}"`);
		}

		seen.add(name);

		const normalizedPillar = typeof pillar === 'string' && pillar.trim() ? pillar.trim() : undefined;
		const rawPillarEmoji = typeof pillarEmoji === 'string' ? pillarEmoji : pillar_emoji;
		const normalizedEmoji =
			typeof rawPillarEmoji === 'string' && rawPillarEmoji.trim() ? rawPillarEmoji.trim() : undefined;
		const autoEmoji =
			normalizedPillar && pillarEmojiMap[normalizedPillar.toLowerCase()] !== undefined
				? pillarEmojiMap[normalizedPillar.toLowerCase()]
				: undefined;
		const normalizedPriority =
			priority === undefined
				? undefined
				: Number.isFinite(Number(priority)) && Number(priority) >= 0
					? Math.round(Number(priority))
					: undefined;

		return {
			name: name.trim(),
			defaultDurationSeconds: Math.max(0, Math.round(defaultDurationSeconds)),
			holdLabels: normalizeLabels(holdLabels),
			pillar: normalizedPillar,
			pillarEmoji: normalizedEmoji ?? autoEmoji,
			priority: normalizedPriority,
			recurrence: normalizeRecurrence(recurrence, name.trim())
		};
	});
}

async function ensureTemplateFile() {
	await fs.mkdir(DATA_DIR, { recursive: true });

	const hasTodos = await fs
		.access(TODOS_FILE)
		.then(() => true)
		.catch(() => false);
	if (hasTodos) return TODOS_FILE;

	const hasStretches = await fs
		.access(STRETCHES_FILE)
		.then(() => true)
		.catch(() => false);
	if (hasStretches) return STRETCHES_FILE;

	const fallback: StretchTemplate[] = [
		{ name: 'Plan the day', defaultDurationSeconds: 300, pillar: 'Planning', pillarEmoji: '🧭' },
		{ name: 'Inbox triage', defaultDurationSeconds: 600, pillar: 'Operations', pillarEmoji: '🛠️' },
		{ name: 'Deep work block', defaultDurationSeconds: 1500, pillar: 'Focus', pillarEmoji: '🎯' },
		{ name: 'Walk and reset', defaultDurationSeconds: 600, pillar: 'Recovery', pillarEmoji: '🌿' },
		{ name: 'Shutdown routine', defaultDurationSeconds: 420, pillar: 'Planning', pillarEmoji: '🧭' }
	];
	const yaml = YAML.stringify(fallback);
	await fs.writeFile(TODOS_FILE, yaml, 'utf8');
	return TODOS_FILE;
}

export async function loadStretchTemplate(): Promise<{ template: StretchTemplate[]; version: number }> {
	const { map: pillarEmojiMap } = await loadPillarEmojiMap();
	const templatePath = await ensureTemplateFile();
	const stats = await fs.stat(templatePath);

	if (cachedTemplate && cachedTemplate.mtimeMs === stats.mtimeMs && cachedTemplate.file === templatePath) {
		return { template: cachedTemplate.value, version: cachedTemplate.mtimeMs };
	}

	const raw = await fs.readFile(templatePath, 'utf8');
	const parsed = YAML.parse(raw);
	const template = validateTemplate(parsed, path.basename(templatePath), pillarEmojiMap);

	cachedTemplate = { mtimeMs: stats.mtimeMs, value: template, file: templatePath };
	return { template, version: stats.mtimeMs };
}

export async function getStretchTemplateVersion(): Promise<number> {
	const templatePath = await ensureTemplateFile();
	const stats = await fs.stat(templatePath);
	return stats.mtimeMs;
}
