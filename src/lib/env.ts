import path from 'path';

export const APP_ENV = process.env.APP_ENV ?? 'prod';
export const isDevEnv = APP_ENV === 'dev';

export const dataDirName = isDevEnv ? 'data-dev' : 'data';
export const fallbackDirName = isDevEnv ? '.data-dev-fallback' : '.data-fallback';

export const DEFAULT_DATA_DIR = path.join(process.cwd(), dataDirName);
export const FALLBACK_DATA_DIR = path.join(process.cwd(), fallbackDirName);
