import type { Handle } from '@sveltejs/kit';
import { startScheduledSeeding } from '$lib/server/scheduledHistory';

// Kick off background scheduled-entry seeding when the server boots.
startScheduledSeeding();

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
