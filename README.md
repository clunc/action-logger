# action-logger

Action Logger is a daily execution tracker: load a curated list of recurring and one-off tasks, mark subtasks as you work, and keep an audit trail of what you actually did today.

## What it does
- Builds a “today” session from recurring rules and due/overdue one-offs.
- Lets you start, complete, skip, and undo subtasks; records timestamp, status, and duration.
- Shows “Today’s Actions” so you can review what you did and when.
- Surfaces progress (today’s completion %), streaks (consecutive days with activity), and monthly accordance (days with any action this month).
- Supports adding or deleting one-off tasks from the UI; recurring tasks stay in the template.

## Quick start (dev)
```bash
npm install
npm run dev
```
Open the app, work through subtasks, and you’ll see each action appear in Today’s Actions. In dev mode, seed data loads if the stores are empty so you can try the flow immediately.

## Data
- History entries persist via `/api/history`, using SQLite when available or a JSON fallback.
- Each entry stores task id/name, subtask number, status (`done`, `skipped`, `in-progress`), timestamp, duration, and occurrence date.

## Tech
- SvelteKit frontend with Svelte components for task cards and the history list.
- Server endpoints under `/api` manage history, task templates, recurring tasks, and one-offs.
