/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import { calculateNextRunAt } from './scheduledTaskMath';
import type { ScheduledTask } from './scheduledTasks';

const baseTask: ScheduledTask = {
  id: 'task',
  name: 'Task',
  prompt: 'Do something',
  enabled: true,
  frequency: 'once',
  createdAt: Date.parse('2026-05-22T08:00:00'),
  updatedAt: Date.parse('2026-05-22T08:00:00'),
};

describe('calculateNextRunAt', () => {
  it('returns the future run date for one-time tasks', () => {
    const nextRunAt = calculateNextRunAt(
      {
        ...baseTask,
        runAt: '2026-05-22T09:30',
      },
      Date.parse('2026-05-22T09:00:00'),
    );

    expect(nextRunAt).toBe(Date.parse('2026-05-22T09:30:00'));
  });

  it('returns null for disabled tasks', () => {
    expect(
      calculateNextRunAt(
        {
          ...baseTask,
          enabled: false,
          runAt: '2026-05-22T09:30',
        },
        Date.parse('2026-05-22T09:00:00'),
      ),
    ).toBeNull();
  });

  it('moves daily tasks to tomorrow when today has passed', () => {
    const nextRunAt = calculateNextRunAt(
      {
        ...baseTask,
        frequency: 'daily',
        timeOfDay: '09:00',
      },
      Date.parse('2026-05-22T10:00:00'),
    );

    expect(nextRunAt).toBe(Date.parse('2026-05-23T09:00:00'));
  });

  it('selects the next matching weekly day', () => {
    const nextRunAt = calculateNextRunAt(
      {
        ...baseTask,
        frequency: 'weekly',
        daysOfWeek: [1],
        timeOfDay: '08:30',
      },
      Date.parse('2026-05-22T10:00:00'),
    );

    expect(nextRunAt).toBe(Date.parse('2026-05-25T08:30:00'));
  });

  it('uses last run time for interval tasks', () => {
    const nextRunAt = calculateNextRunAt(
      {
        ...baseTask,
        frequency: 'interval',
        intervalMinutes: 15,
        lastRunAt: Date.parse('2026-05-22T09:00:00'),
      },
      Date.parse('2026-05-22T09:05:00'),
    );

    expect(nextRunAt).toBe(Date.parse('2026-05-22T09:15:00'));
  });
});
