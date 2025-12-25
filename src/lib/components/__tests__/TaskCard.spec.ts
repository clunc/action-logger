import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import TaskCard from '../TaskCard.svelte';
import type { SessionTask } from '$lib/types';

const sessionTask = (overrides: Partial<SessionTask> = {}): SessionTask => ({
	name: 'Test Task',
	defaultDurationSeconds: 0,
	subtasks: [
		{
			subtaskNumber: 1,
			durationSeconds: 0,
			completed: false,
			timestamp: null,
			status: 'pending'
		}
	],
	...overrides
});

const baseTask = (overrides: Record<string, unknown> = {}) => ({
	task: sessionTask(),
	taskIdx: 0,
	recurrenceLabel: 'Recurring',
	pillarLabel: 'Planning',
	pillarEmoji: '🧭',
	onLogSubtask: vi.fn(),
	onUndoSubtask: vi.fn(),
	onSkipSubtask: vi.fn(),
	showSkip: false,
	overdue: false,
	isOneOff: false,
	...overrides
});

describe('TaskCard', () => {
	it('renders overdue siren pill when overdue', () => {
		const { getByText } = render(TaskCard, baseTask({ overdue: true }));
		expect(getByText('Overdue')).toBeTruthy();
	});

	it('shows pin icon for one-offs and loop for recurring', () => {
		const oneOff = render(TaskCard, baseTask({ isOneOff: true }));
		expect(oneOff.getByLabelText('Recurring task').textContent).toContain('📌');
		cleanup();

		const recurring = render(TaskCard, baseTask({ isOneOff: false }));
		expect(recurring.getByLabelText('Recurring task').textContent).toContain('🔁');
	});

	it('calls skip handler when skip is shown', async () => {
		const onSkipSubtask = vi.fn();
		const { getByLabelText } = render(TaskCard, baseTask({ showSkip: true, onSkipSubtask }));

		const skipBtn = getByLabelText('Skip action');
		await fireEvent.click(skipBtn);
		expect(onSkipSubtask).toHaveBeenCalled();
	});
});
