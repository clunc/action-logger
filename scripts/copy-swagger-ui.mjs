import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerSourceDir = path.resolve(__dirname, '..', 'node_modules', 'swagger-ui-dist');
const swaggerTargetDir = path.resolve(__dirname, '..', 'static', 'swagger-ui');
const redocSourceDir = path.resolve(__dirname, '..', 'node_modules', 'redoc', 'bundles');
const redocTargetDir = path.resolve(__dirname, '..', 'static', 'redoc');

const swaggerFiles = [
	'swagger-ui.css',
	'swagger-ui.css.map',
	'swagger-ui-bundle.js',
	'swagger-ui-bundle.js.map',
	'swagger-ui-standalone-preset.js',
	'swagger-ui-standalone-preset.js.map'
];
const redocFiles = ['redoc.standalone.js'];

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function copyFile(sourceDir, targetDir, fileName) {
	const src = path.join(sourceDir, fileName);
	const dest = path.join(targetDir, fileName);
	await fs.copyFile(src, dest);
}

async function main() {
	try {
		await ensureDir(swaggerTargetDir);
		await ensureDir(redocTargetDir);
		await Promise.all(swaggerFiles.map((file) => copyFile(swaggerSourceDir, swaggerTargetDir, file)));
		await Promise.all(redocFiles.map((file) => copyFile(redocSourceDir, redocTargetDir, file)));
	} catch (error) {
		console.error('Failed to copy Swagger UI assets', error);
		process.exitCode = 1;
	}
}

await main();
