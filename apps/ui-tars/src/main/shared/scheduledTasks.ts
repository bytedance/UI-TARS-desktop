/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export type ScheduledTaskFrequency = 'once' | 'daily' | 'weekly' | 'interval';

export type ScheduledTask = {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  frequency: ScheduledTaskFrequency;
  runAt?: string;
  timeOfDay?: string;
  daysOfWeek?: number[];
  intervalMinutes?: number;
  lastRunAt?: number;
  nextRunAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateScheduledTaskInput = Omit<
  ScheduledTask,
  'id' | 'enabled' | 'lastRunAt' | 'nextRunAt' | 'createdAt' | 'updatedAt'
> & {
  enabled?: boolean;
};
