/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ScheduledTask } from './scheduledTasks';

const MIN_INTERVAL_MS = 60 * 1000;

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

const getTimeParts = (timeOfDay?: string) => {
  const [hours, minutes] = normalizeTimeOfDay(timeOfDay).split(':').map(Number);
  return { hours, minutes };
};

const setTimeOfDay = (date: Date, timeOfDay?: string) => {
  const { hours, minutes } = getTimeParts(timeOfDay);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const calculateNextRunAt = (
  task: ScheduledTask,
  from = Date.now(),
): number | null => {
  if (!task.enabled) {
    return null;
  }

  if (task.frequency === 'once') {
    const timestamp = task.runAt ? new Date(task.runAt).getTime() : NaN;
    return Number.isFinite(timestamp) && timestamp > from ? timestamp : null;
  }

  if (task.frequency === 'interval') {
    const intervalMs = Math.max(1, task.intervalMinutes || 1) * MIN_INTERVAL_MS;
    const base = task.lastRunAt || task.createdAt || from;
    return Math.max(base + intervalMs, from + MIN_INTERVAL_MS);
  }

  if (task.frequency === 'daily') {
    const next = setTimeOfDay(new Date(from), task.timeOfDay);
    if (next.getTime() <= from) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  }

  const days = task.daysOfWeek?.length
    ? task.daysOfWeek
    : [new Date().getDay()];
  const uniqueDays = Array.from(new Set(days)).filter(
    (day) => day >= 0 && day <= 6,
  );

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = setTimeOfDay(new Date(from), task.timeOfDay);
    candidate.setDate(candidate.getDate() + offset);

    if (uniqueDays.includes(candidate.getDay()) && candidate.getTime() > from) {
      return candidate.getTime();
    }
  }

  return null;
};
