/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import ElectronStore from 'electron-store';
import { BrowserWindow } from 'electron';
import { Conversation, StatusEnum } from '@ui-tars/shared/types';

import { logger } from '@main/logger';
import { runAgent } from '@main/services/runAgent';
import { store } from '@main/store/create';
import type {
  ScheduledTask,
  CreateScheduledTaskInput,
} from '@main/shared/scheduledTasks';
import { calculateNextRunAt } from '@main/shared/scheduledTaskMath';

type ScheduledTaskStore = {
  tasks: ScheduledTask[];
};

const DEFAULT_STORE: ScheduledTaskStore = {
  tasks: [],
};

const MAX_TIMEOUT_MS = 2_147_483_647;

const normalizeTimeOfDay = (timeOfDay?: string) => {
  if (!timeOfDay || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
    return '09:00';
  }

  const [hours, minutes] = timeOfDay.split(':').map(Number);
  if (hours > 23 || minutes > 59) {
    return '09:00';
  }

  return timeOfDay;
};

class ScheduledTaskService {
  private static instance: ScheduledTaskService;
  private readonly store = new ElectronStore<ScheduledTaskStore>({
    name: 'ui_tars.scheduled-tasks',
    defaults: DEFAULT_STORE,
  });
  private timers = new Map<string, NodeJS.Timeout>();
  private runningTaskIds = new Set<string>();

  private constructor() {}

  public static getInstance(): ScheduledTaskService {
    if (!ScheduledTaskService.instance) {
      ScheduledTaskService.instance = new ScheduledTaskService();
    }
    return ScheduledTaskService.instance;
  }

  public start() {
    this.rescheduleAll();
  }

  public list() {
    return this.getTasks().map((task) => this.withNextRun(task));
  }

  public create(input: CreateScheduledTaskInput) {
    if (!input.prompt.trim()) {
      throw new Error('Task prompt is required');
    }

    const now = Date.now();
    const task = this.withNextRun({
      ...input,
      id: `task_${now}_${Math.random().toString(36).slice(2, 10)}`,
      name: input.name.trim() || 'Scheduled task',
      prompt: input.prompt.trim(),
      enabled: input.enabled ?? true,
      daysOfWeek: input.daysOfWeek?.length
        ? input.daysOfWeek
        : [new Date().getDay()],
      timeOfDay: normalizeTimeOfDay(input.timeOfDay),
      intervalMinutes: Math.max(1, input.intervalMinutes || 60),
      createdAt: now,
      updatedAt: now,
    });

    const tasks = [...this.getTasks(), task];
    this.save(tasks);
    return task;
  }

  public update(id: string, updates: Partial<ScheduledTask>) {
    let updatedTask: ScheduledTask | null = null;
    const tasks = this.getTasks().map((task) => {
      if (task.id !== id) {
        return task;
      }

      updatedTask = this.withNextRun({
        ...task,
        ...updates,
        id: task.id,
        name: updates.name?.trim() || task.name,
        prompt: updates.prompt?.trim() || task.prompt,
        updatedAt: Date.now(),
      });
      return updatedTask;
    });

    this.save(tasks);
    return updatedTask;
  }

  public delete(id: string) {
    this.clearTimer(id);
    const currentTasks = this.getTasks();
    const tasks = currentTasks.filter((task) => task.id !== id);
    this.save(tasks);
    return tasks.length !== currentTasks.length;
  }

  public async runNow(id: string) {
    const task = this.list().find((item) => item.id === id);
    if (!task) {
      throw new Error('Scheduled task not found');
    }

    await this.runTask(task, true);
    return this.list().find((item) => item.id === id) || null;
  }

  private async runTask(task: ScheduledTask, manual = false) {
    if (this.runningTaskIds.has(task.id)) {
      return;
    }

    const { thinking } = store.getState();
    if (thinking) {
      logger.warn(
        '[ScheduledTask] skip because agent is already running',
        task.id,
      );
      this.reschedule(task);
      return;
    }

    this.runningTaskIds.add(task.id);

    try {
      const now = Date.now();
      const humanMessage: Conversation = {
        from: 'human',
        value: task.prompt,
        timing: { start: now, end: now, cost: 0 },
      };

      store.setState({
        abortController: new AbortController(),
        thinking: true,
        errorMsg: null,
        instructions: task.prompt,
        messages: [humanMessage],
        sessionHistoryMessages: [],
      });

      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.show();
          win.webContents.send('scheduled-task-started', task);
        }
      });

      await runAgent(store.setState, store.getState);

      const completedTask = {
        ...task,
        enabled: task.frequency === 'once' && !manual ? false : task.enabled,
        lastRunAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.update(task.id, completedTask);
    } catch (error) {
      logger.error('[ScheduledTask] run failed', error);
      store.setState({
        status: StatusEnum.ERROR,
        errorMsg: error instanceof Error ? error.message : String(error),
      });
      this.reschedule(task);
    } finally {
      store.setState({ thinking: false });
      this.runningTaskIds.delete(task.id);
    }
  }

  private withNextRun(task: ScheduledTask): ScheduledTask {
    return {
      ...task,
      nextRunAt: calculateNextRunAt(task),
    };
  }

  private rescheduleAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.list().forEach((task) => this.reschedule(task));
  }

  private reschedule(task: ScheduledTask) {
    this.clearTimer(task.id);
    const nextRunAt = calculateNextRunAt(task);

    const tasks = this.getTasks().map((item) =>
      item.id === task.id ? { ...item, nextRunAt } : item,
    );
    this.save(tasks, false);

    if (!nextRunAt) {
      return;
    }

    const delay = Math.min(
      Math.max(nextRunAt - Date.now(), 1000),
      MAX_TIMEOUT_MS,
    );
    const timer = setTimeout(() => {
      const latest = this.list().find((item) => item.id === task.id);
      if (latest?.enabled) {
        void this.runTask(latest);
      }
    }, delay);

    this.timers.set(task.id, timer);
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private getTasks() {
    return this.store.get('tasks') || [];
  }

  private save(tasks: ScheduledTask[], schedule = true) {
    this.store.set('tasks', tasks);
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('scheduled-tasks-updated', tasks);
      }
    });

    if (schedule) {
      this.rescheduleAll();
    }
  }
}

export const scheduledTaskService = ScheduledTaskService.getInstance();
