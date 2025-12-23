// Stub left in place to satisfy stale client bundles that may still request this module.
// The current app does not use the todo API; these functions no-op to avoid runtime errors.
type TodoStub = { id: number; title: string; completed: boolean; createdAt: string; updatedAt: string };

export async function fetchTodos(): Promise<TodoStub[]> {
	return [];
}

export async function createTodo(_title: string): Promise<TodoStub> {
	return { id: Date.now(), title: _title, completed: false, createdAt: '', updatedAt: '' };
}

export async function updateTodo(
	id: number,
	_patch: Partial<Pick<TodoStub, 'title' | 'completed'>>
): Promise<TodoStub> {
	return { id, title: _patch.title ?? '', completed: _patch.completed ?? false, createdAt: '', updatedAt: '' };
}

export async function deleteTodo(_id: number): Promise<void> {
	return;
}
