/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@renderer/api';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Switch } from '@renderer/components/ui/switch';
import { Textarea } from '@renderer/components/ui/textarea';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import type {
  CreateScheduledTaskInput,
  ScheduledTask,
  ScheduledTaskFrequency,
} from '@main/shared/scheduledTasks';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const formatDateTime = (timestamp?: number | null) => {
  if (!timestamp) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
};

const toDateTimeLocal = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getDefaultRunAt = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  date.setSeconds(0, 0);
  return toDateTimeLocal(date);
};

const describeSchedule = (task: ScheduledTask) => {
  if (task.frequency === 'once') {
    return `Once at ${task.runAt ? formatDateTime(new Date(task.runAt).getTime()) : 'a selected time'}`;
  }

  if (task.frequency === 'daily') {
    return `Daily at ${task.timeOfDay || '09:00'}`;
  }

  if (task.frequency === 'weekly') {
    const labels = (task.daysOfWeek || [])
      .map((day) => DAYS.find((item) => item.value === day)?.label)
      .filter(Boolean)
      .join(', ');
    return `Weekly on ${labels || 'selected days'} at ${task.timeOfDay || '09:00'}`;
  }

  return `Every ${task.intervalMinutes || 60} minutes`;
};

export default function ScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [frequency, setFrequency] = useState<ScheduledTaskFrequency>('once');
  const [runAt, setRunAt] = useState(getDefaultRunAt);
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([new Date().getDay()]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          (a.nextRunAt || Number.MAX_SAFE_INTEGER) -
          (b.nextRunAt || Number.MAX_SAFE_INTEGER),
      ),
    [tasks],
  );

  const loadTasks = useCallback(async () => {
    const nextTasks = await api.listScheduledTasks();
    setTasks(nextTasks || []);
  }, []);

  useEffect(() => {
    loadTasks();
    window.electron.scheduledTask.onUpdate(setTasks);
    window.electron.scheduledTask.onStarted((task) => {
      toast.info(`Running scheduled task: ${task.name}`);
    });
  }, [loadTasks]);

  const resetForm = () => {
    setName('');
    setPrompt('');
    setFrequency('once');
    setRunAt(getDefaultRunAt());
    setTimeOfDay('09:00');
    setDaysOfWeek([new Date().getDay()]);
    setIntervalMinutes(60);
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((current) => {
      if (current.includes(day)) {
        const next = current.filter((item) => item !== day);
        return next.length ? next : current;
      }
      return [...current, day].sort();
    });
  };

  const buildPayload = (): CreateScheduledTaskInput => ({
    name: name.trim() || prompt.trim().slice(0, 48) || 'Scheduled task',
    prompt: prompt.trim(),
    frequency,
    runAt: frequency === 'once' ? runAt : undefined,
    timeOfDay:
      frequency === 'daily' || frequency === 'weekly' ? timeOfDay : undefined,
    daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
    intervalMinutes:
      frequency === 'interval' ? Math.max(1, intervalMinutes) : undefined,
  });

  const createTask = async () => {
    if (!prompt.trim()) {
      toast.warning('Enter a prompt for the task.');
      return;
    }

    if (frequency === 'once' && new Date(runAt).getTime() <= Date.now()) {
      toast.warning('Choose a future time.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createScheduledTask(buildPayload());
      await loadTasks();
      resetForm();
      toast.success('Scheduled task created.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create scheduled task.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<ScheduledTask>) => {
    await api.updateScheduledTask({ id, updates });
    await loadTasks();
  };

  const deleteTask = async (id: string) => {
    await api.deleteScheduledTask({ id });
    await loadTasks();
  };

  const runNow = async (id: string) => {
    await api.runScheduledTaskNow({ id });
    await loadTasks();
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <div className="flex items-center gap-3">
          <SidebarTrigger variant="secondary" className="size-8" />
          <CalendarClock className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-medium">Scheduled Tasks</h1>
            <p className="text-xs text-muted-foreground">
              Runs while UI-TARS Desktop is open.
            </p>
          </div>
        </div>
        <Badge variant="secondary">{tasks.length} tasks</Badge>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr]">
        <div className="border-r p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                placeholder="Morning status check"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-prompt">Prompt</Label>
              <Textarea
                id="task-prompt"
                className="min-h-[140px] resize-none"
                placeholder="Open the browser and summarize today's..."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as ScheduledTaskFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="interval">Interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === 'once' && (
              <div className="space-y-2">
                <Label htmlFor="run-at">Run at</Label>
                <Input
                  id="run-at"
                  type="datetime-local"
                  value={runAt}
                  onChange={(event) => setRunAt(event.target.value)}
                />
              </div>
            )}

            {(frequency === 'daily' || frequency === 'weekly') && (
              <div className="space-y-2">
                <Label htmlFor="time-of-day">Time</Label>
                <Input
                  id="time-of-day"
                  type="time"
                  value={timeOfDay}
                  onChange={(event) => setTimeOfDay(event.target.value)}
                />
              </div>
            )}

            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Days</Label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={
                        daysOfWeek.includes(day.value) ? 'default' : 'outline'
                      }
                      size="sm"
                      className="px-0"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {frequency === 'interval' && (
              <div className="space-y-2">
                <Label htmlFor="interval">Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="interval"
                    type="number"
                    min={1}
                    value={intervalMinutes}
                    onChange={(event) =>
                      setIntervalMinutes(Number(event.target.value))
                    }
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={createTask}
              disabled={submitting}
            >
              <Plus />
              Create Task
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0">
          <div className="space-y-3 p-5">
            {sortedTasks.length === 0 ? (
              <div className="flex h-[calc(100vh-120px)] items-center justify-center rounded-md border border-dashed">
                <div className="text-center">
                  <Clock className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No scheduled tasks</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create one to run an instruction later.
                  </p>
                </div>
              </div>
            ) : (
              sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-md border bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-medium">
                          {task.name}
                        </h2>
                        <Badge
                          variant={task.enabled ? 'default' : 'outline'}
                          className="capitalize"
                        >
                          {task.enabled ? 'Enabled' : 'Paused'}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {task.frequency}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {task.prompt}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{describeSchedule(task)}</span>
                        <span>Next: {formatDateTime(task.nextRunAt)}</span>
                        {task.lastRunAt && (
                          <span>Last: {formatDateTime(task.lastRunAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={(enabled) =>
                          updateTask(task.id, { enabled })
                        }
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => runNow(task.id)}
                      >
                        <Play className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
