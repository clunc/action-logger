import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { StretchTemplate } from '$lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TODOS_FILE = path.join(DATA_DIR, 'todos.yaml');
const STRETCHES_FILE = path.join(DATA_DIR, 'stretches.yaml'); // kept for backward compatibility

let cachedTemplate: { mtimeMs: number; value: StretchTemplate[]; file: string } | null = null;

function normalizeLabels(labels: unknown): string[] | undefined {
	if (!Array.isArray(labels)) return undefined;
	const cleaned = labels.map((label) => (typeof label === 'string' ? label.trim() : '')).filter(Boolean);
	return cleaned.length ? cleaned : undefined;
}

function validateTemplate(raw: unknown, fileName: string): StretchTemplate[] {
	if (!Array.isArray(raw)) {
		throw new Error(`${fileName} must be an array of todos`);
	}

	const seen = new Set<string>();

	return raw.map((entry, idx) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`${fileName} entry ${idx + 1} is not an object`);
		}

		const { name, defaultDurationSeconds, holdLabels } = entry as Record<string, unknown>;

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

		return {
			name: name.trim(),
			defaultDurationSeconds: Math.max(0, Math.round(defaultDurationSeconds)),
			holdLabels: normalizeLabels(holdLabels)
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
		{ name: 'Plan the day', defaultDurationSeconds: 300 },
		{ name: 'Inbox triage', defaultDurationSeconds: 600 },
		{ name: 'Deep work block', defaultDurationSeconds: 1500 },
		{ name: 'Walk and reset', defaultDurationSeconds: 600 },
		{ name: 'Shutdown routine', defaultDurationSeconds: 420 }
	];
	const yaml = YAML.stringify(fallback);
	await fs.writeFile(TODOS_FILE, yaml, 'utf8');
	return TODOS_FILE;
}

export async function loadStretchTemplate(): Promise<{ template: StretchTemplate[]; version: number }> {
	const templatePath = await ensureTemplateFile();
	const stats = await fs.stat(templatePath);

	if (cachedTemplate && cachedTemplate.mtimeMs === stats.mtimeMs && cachedTemplate.file === templatePath) {
		return { template: cachedTemplate.value, version: cachedTemplate.mtimeMs };
	}

	const raw = await fs.readFile(templatePath, 'utf8');
	const parsed = YAML.parse(raw);
	const template = validateTemplate(parsed, path.basename(templatePath));

	cachedTemplate = { mtimeMs: stats.mtimeMs, value: template, file: templatePath };
	return { template, version: stats.mtimeMs };
}

export async function getStretchTemplateVersion(): Promise<number> {
	const templatePath = await ensureTemplateFile();
	const stats = await fs.stat(templatePath);
	return stats.mtimeMs;
}
