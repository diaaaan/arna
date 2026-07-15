export type Task = {
  id: string;
  originThoughtId: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateTaskInput = {
  originThoughtId: string;
  title: string;
  dueDate: string | null;
};

export function createTask({
  originThoughtId,
  title,
  dueDate,
}: CreateTaskInput): Task {
  const timestamp = new Date().toISOString();

  return {
    id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    originThoughtId,
    title,
    completed: false,
    dueDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const task = value as Record<string, unknown>;

  return (
    typeof task.id === 'string' &&
    typeof task.originThoughtId === 'string' &&
    typeof task.title === 'string' &&
    typeof task.completed === 'boolean' &&
    (task.dueDate === null || typeof task.dueDate === 'string') &&
    typeof task.createdAt === 'string' &&
    typeof task.updatedAt === 'string'
  );
}
