import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openApiSpec } from '$lib/server/openapi';

export const GET: RequestHandler = async () => json(openApiSpec);
