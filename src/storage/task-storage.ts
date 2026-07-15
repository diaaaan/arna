import AsyncStorage from '@react-native-async-storage/async-storage';

import { isTask, type Task } from '../entities/task/task';

export const TASKS_STORAGE_KEY = 'arna.tasks.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadTasks(): Promise<Task[]> {
  const storedValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isTask)) {
    throw new Error('Stored tasks have an invalid format.');
  }

  return parsedValue;
}

export function appendTask(task: Task): Promise<void> {
  const operation = writeQueue.then(async () => {
    const tasks = await loadTasks();

    await AsyncStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([...tasks, task]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}

export function toggleTaskCompleted(taskId: string): Promise<void> {
  const operation = writeQueue.then(async () => {
    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      throw new Error('Task was not found.');
    }

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = {
      ...tasks[taskIndex],
      completed: !tasks[taskIndex].completed,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
