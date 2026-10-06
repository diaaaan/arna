import AsyncStorage from '@react-native-async-storage/async-storage';

import { isTask, type Task } from '../entities/task/task';

import { readCollection } from './json-collection';

export const TASKS_STORAGE_KEY = 'arna.tasks.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadTasks(): Promise<Task[]> {
  return readCollection(TASKS_STORAGE_KEY, (value) =>
    isTask(value) ? value : null,
  );
}

export function appendTask(task: Task): Promise<void> {
  const operation = writeQueue.then(async () => {
    const tasks = await loadTasks();

    if (tasks.some((stored) => stored.originThoughtId === task.originThoughtId)) {
      return;
    }

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
