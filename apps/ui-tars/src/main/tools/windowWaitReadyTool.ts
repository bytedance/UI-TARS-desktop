/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'crypto';

import { z } from 'zod';

import { TOOL_REGISTRY_VERSION } from './toolRegistry';
import {
  type SystemRunToolCallV1,
  type SystemRunToolResultV1,
  buildSystemRunToolCall,
  runSystemRunToolCall,
} from './systemRunTool';

const WINDOW_WAIT_READY_TOOL_NAME = 'window.wait_ready';
const WINDOW_WAIT_READY_TOOL_CALL_VERSION = 'v1';
const WINDOW_WAIT_READY_TOOL_RESULT_VERSION = 'v1';
const WINDOW_WAIT_READY_DEFAULT_TIMEOUT_MS = 10000;
const WINDOW_WAIT_READY_MAX_TIMEOUT_MS = 60000;
const WINDOW_WAIT_READY_DEFAULT_POLL_INTERVAL_MS = 500;
const WINDOW_WAIT_READY_MIN_POLL_INTERVAL_MS = 100;

const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'] as const;
const WINDOW_WAIT_READY_TARGETS = ['cursor', 'settings', 'notepad'] as const;

type WindowWaitReadyTarget = (typeof WINDOW_WAIT_READY_TARGETS)[number];
type WindowWaitReadyPlatform = (typeof SUPPORTED_PLATFORMS)[number];

type WindowWaitReadyCatalogEntry = {
  displayName: string;
  checkArgvByPlatform: Partial<Record<WindowWaitReadyPlatform, string[]>>;
};

const WINDOW_WAIT_READY_CATALOG: Record<
  WindowWaitReadyTarget,
  WindowWaitReadyCatalogEntry
> = {
  cursor: {
    displayName: 'Cursor',
    checkArgvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        "if (Get-Process -Name 'cursor' -ErrorAction SilentlyContinue) { exit 0 } else { exit 3 }",
      ],
      darwin: ['pgrep', '-x', 'Cursor'],
      linux: ['pgrep', '-x', 'cursor'],
    },
  },
  settings: {
    displayName: 'System Settings',
    checkArgvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        "if (Get-Process -Name 'SystemSettings' -ErrorAction SilentlyContinue) { exit 0 } else { exit 3 }",
      ],
      darwin: ['pgrep', '-x', 'System Settings'],
      linux: ['pgrep', '-f', 'gnome-control-center'],
    },
  },
  notepad: {
    displayName: 'Notepad',
    checkArgvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        "if (Get-Process -Name 'notepad' -ErrorAction SilentlyContinue) { exit 0 } else { exit 3 }",
      ],
      darwin: ['pgrep', '-x', 'TextEdit'],
      linux: ['pgrep', '-x', 'gedit'],
    },
  },
};

const WindowWaitReadyInputSchema = z.object({
  intentId: z.string().min(1),
  targetWindow: z.enum(WINDOW_WAIT_READY_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS).optional(),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(WINDOW_WAIT_READY_MAX_TIMEOUT_MS)
    .default(WINDOW_WAIT_READY_DEFAULT_TIMEOUT_MS),
  pollIntervalMs: z
    .number()
    .finite()
    .int()
    .min(WINDOW_WAIT_READY_MIN_POLL_INTERVAL_MS)
    .default(WINDOW_WAIT_READY_DEFAULT_POLL_INTERVAL_MS),
  idempotencyKey: z.string().min(1),
});

const WindowWaitReadyCanonicalArgsSchema = z.object({
  targetWindow: z.enum(WINDOW_WAIT_READY_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS),
  checkArgv: z.array(z.string()).min(1),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(WINDOW_WAIT_READY_MAX_TIMEOUT_MS),
  pollIntervalMs: z
    .number()
    .finite()
    .int()
    .min(WINDOW_WAIT_READY_MIN_POLL_INTERVAL_MS),
});

const WindowWaitReadyToolCallSchema = z.object({
  version: z.literal(WINDOW_WAIT_READY_TOOL_CALL_VERSION),
  callId: z.string().min(1),
  intentId: z.string().min(1),
  toolName: z.literal(WINDOW_WAIT_READY_TOOL_NAME),
  toolVersion: z.string().min(1),
  canonicalArgs: WindowWaitReadyCanonicalArgsSchema,
  idempotencyKey: z.string().min(1),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(WINDOW_WAIT_READY_MAX_TIMEOUT_MS),
});

const WindowWaitReadyToolResultSchema = z.object({
  version: z.literal(WINDOW_WAIT_READY_TOOL_RESULT_VERSION),
  callId: z.string().min(1),
  toolName: z.literal(WINDOW_WAIT_READY_TOOL_NAME),
  toolVersion: z.string().min(1),
  status: z.enum(['ok', 'error', 'timeout']),
  errorClass: z.enum([
    'none',
    'validation_error',
    'unsupported_target',
    'window_not_ready',
    'spawn_error',
    'timeout',
    'non_zero_exit',
  ]),
  ready: z.boolean(),
  systemRunCallId: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().finite().nonnegative(),
  artifacts: z.object({
    targetWindow: z.enum(WINDOW_WAIT_READY_TARGETS).nullable(),
    platform: z.enum(SUPPORTED_PLATFORMS).nullable(),
    stdoutBytes: z.number().int().nonnegative(),
    stderrBytes: z.number().int().nonnegative(),
    stdoutTruncated: z.boolean(),
    stderrTruncated: z.boolean(),
  }),
});

export type WindowWaitReadyToolCallV1 = z.infer<
  typeof WindowWaitReadyToolCallSchema
>;
export type WindowWaitReadyToolResultV1 = z.infer<
  typeof WindowWaitReadyToolResultSchema
>;

type WindowWaitReadyExecutionOptions = {
  runSystemRun?: (call: SystemRunToolCallV1) => Promise<SystemRunToolResultV1>;
  sleepMs?: (ms: number) => Promise<void>;
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const resolvePlatform = (platform?: string): WindowWaitReadyPlatform => {
  const fallback = process.platform;
  const candidate = platform || fallback;
  if (SUPPORTED_PLATFORMS.includes(candidate as WindowWaitReadyPlatform)) {
    return candidate as WindowWaitReadyPlatform;
  }
  return 'win32';
};

const resolveCheckArgv = (
  targetWindow: WindowWaitReadyTarget,
  platform: WindowWaitReadyPlatform,
): string[] | null => {
  const byPlatform =
    WINDOW_WAIT_READY_CATALOG[targetWindow]?.checkArgvByPlatform || {};
  const argv = byPlatform[platform];
  return Array.isArray(argv) && argv.length > 0 ? [...argv] : null;
};

export const buildWindowWaitReadyToolCall = (params: {
  intentId: string;
  targetWindow: WindowWaitReadyTarget;
  platform?: WindowWaitReadyPlatform;
  timeoutMs?: number;
  pollIntervalMs?: number;
  idempotencyKey: string;
}): WindowWaitReadyToolCallV1 => {
  const parsed = WindowWaitReadyInputSchema.parse(params);
  const platform = resolvePlatform(parsed.platform);
  const checkArgv = resolveCheckArgv(parsed.targetWindow, platform);

  if (!checkArgv) {
    throw new Error(
      `[WINDOW_WAIT_READY_UNSUPPORTED_TARGET] target=${parsed.targetWindow} platform=${platform}`,
    );
  }

  return WindowWaitReadyToolCallSchema.parse({
    version: WINDOW_WAIT_READY_TOOL_CALL_VERSION,
    callId: randomUUID(),
    intentId: parsed.intentId,
    toolName: WINDOW_WAIT_READY_TOOL_NAME,
    toolVersion: TOOL_REGISTRY_VERSION,
    canonicalArgs: {
      targetWindow: parsed.targetWindow,
      platform,
      checkArgv,
      timeoutMs: parsed.timeoutMs,
      pollIntervalMs: parsed.pollIntervalMs,
    },
    idempotencyKey: parsed.idempotencyKey,
    timeoutMs: parsed.timeoutMs,
  });
};

export const runWindowWaitReadyToolCall = async (
  call: WindowWaitReadyToolCallV1,
  options?: WindowWaitReadyExecutionOptions,
): Promise<WindowWaitReadyToolResultV1> => {
  const startedAt = Date.now();
  const runSystem = options?.runSystemRun ?? runSystemRunToolCall;
  const sleepMs = options?.sleepMs ?? sleep;

  const callRecord =
    typeof call === 'object' && call !== null
      ? (call as Record<string, unknown>)
      : null;
  const fallbackCallId =
    typeof callRecord?.callId === 'string' &&
    callRecord.callId.trim().length > 0
      ? callRecord.callId
      : randomUUID();
  const fallbackToolVersion =
    typeof callRecord?.toolVersion === 'string' &&
    callRecord.toolVersion.trim().length > 0
      ? callRecord.toolVersion
      : TOOL_REGISTRY_VERSION;

  const parsedCallResult = WindowWaitReadyToolCallSchema.safeParse(call);
  if (!parsedCallResult.success) {
    return WindowWaitReadyToolResultSchema.parse({
      version: WINDOW_WAIT_READY_TOOL_RESULT_VERSION,
      callId: fallbackCallId,
      toolName: WINDOW_WAIT_READY_TOOL_NAME,
      toolVersion: fallbackToolVersion,
      status: 'error',
      errorClass: 'validation_error',
      ready: false,
      systemRunCallId: null,
      attempts: 0,
      stdout: '',
      stderr: parsedCallResult.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
      durationMs: Date.now() - startedAt,
      artifacts: {
        targetWindow: null,
        platform: null,
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });
  }

  const parsedCall = parsedCallResult.data;
  const checkArgv = resolveCheckArgv(
    parsedCall.canonicalArgs.targetWindow,
    parsedCall.canonicalArgs.platform,
  );

  if (!checkArgv) {
    return WindowWaitReadyToolResultSchema.parse({
      version: WINDOW_WAIT_READY_TOOL_RESULT_VERSION,
      callId: parsedCall.callId,
      toolName: parsedCall.toolName,
      toolVersion: parsedCall.toolVersion,
      status: 'error',
      errorClass: 'unsupported_target',
      ready: false,
      systemRunCallId: null,
      attempts: 0,
      stdout: '',
      stderr: `[WINDOW_WAIT_READY_UNSUPPORTED_TARGET] target=${parsedCall.canonicalArgs.targetWindow} platform=${parsedCall.canonicalArgs.platform}`,
      durationMs: Date.now() - startedAt,
      artifacts: {
        targetWindow: parsedCall.canonicalArgs.targetWindow,
        platform: parsedCall.canonicalArgs.platform,
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });
  }

  let attempts = 0;
  let lastResult: SystemRunToolResultV1 | null = null;
  let lastCallId: string | null = null;

  while (Date.now() - startedAt < parsedCall.canonicalArgs.timeoutMs) {
    attempts += 1;
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = parsedCall.canonicalArgs.timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }

    const systemRunTimeoutMs = Math.min(
      parsedCall.canonicalArgs.pollIntervalMs,
      parsedCall.canonicalArgs.timeoutMs,
      remainingMs,
    );

    const systemRunCall = buildSystemRunToolCall({
      intentId: parsedCall.intentId,
      argv: checkArgv,
      timeoutMs: systemRunTimeoutMs,
      idempotencyKey: `${parsedCall.idempotencyKey}:window.wait_ready:${parsedCall.canonicalArgs.targetWindow}:${attempts}`,
    });
    lastCallId = systemRunCall.callId;

    try {
      lastResult = await runSystem(systemRunCall);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return WindowWaitReadyToolResultSchema.parse({
        version: WINDOW_WAIT_READY_TOOL_RESULT_VERSION,
        callId: parsedCall.callId,
        toolName: parsedCall.toolName,
        toolVersion: parsedCall.toolVersion,
        status: 'error',
        errorClass: 'spawn_error',
        ready: false,
        systemRunCallId: lastCallId,
        attempts,
        stdout: '',
        stderr: message,
        durationMs: Date.now() - startedAt,
        artifacts: {
          targetWindow: parsedCall.canonicalArgs.targetWindow,
          platform: parsedCall.canonicalArgs.platform,
          stdoutBytes: 0,
          stderrBytes: 0,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      });
    }

    if (lastResult.status === 'ok' && lastResult.errorClass === 'none') {
      return WindowWaitReadyToolResultSchema.parse({
        version: WINDOW_WAIT_READY_TOOL_RESULT_VERSION,
        callId: parsedCall.callId,
        toolName: parsedCall.toolName,
        toolVersion: parsedCall.toolVersion,
        status: 'ok',
        errorClass: 'none',
        ready: true,
        systemRunCallId: lastResult.callId,
        attempts,
        stdout: lastResult.stdout,
        stderr: lastResult.stderr,
        durationMs: Date.now() - startedAt,
        artifacts: {
          targetWindow: parsedCall.canonicalArgs.targetWindow,
          platform: parsedCall.canonicalArgs.platform,
          stdoutBytes: lastResult.artifacts.stdoutBytes,
          stderrBytes: lastResult.artifacts.stderrBytes,
          stdoutTruncated: lastResult.artifacts.stdoutTruncated,
          stderrTruncated: lastResult.artifacts.stderrTruncated,
        },
      });
    }

    const elapsed = Date.now() - startedAt;
    const nextSleepMs = Math.min(
      parsedCall.canonicalArgs.pollIntervalMs,
      parsedCall.canonicalArgs.timeoutMs - elapsed,
    );
    if (nextSleepMs > 0) {
      await sleepMs(nextSleepMs);
    }
  }

  const lastStdout = lastResult?.stdout || '';
  const lastStderr = lastResult?.stderr || '';
  const lastArtifacts = lastResult?.artifacts || {
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutTruncated: false,
    stderrTruncated: false,
  };
  const timeoutErrorClass =
    lastResult?.status === 'timeout' || lastResult?.errorClass === 'timeout'
      ? 'timeout'
      : 'window_not_ready';

  return WindowWaitReadyToolResultSchema.parse({
    version: WINDOW_WAIT_READY_TOOL_RESULT_VERSION,
    callId: parsedCall.callId,
    toolName: parsedCall.toolName,
    toolVersion: parsedCall.toolVersion,
    status: 'timeout',
    errorClass: timeoutErrorClass,
    ready: false,
    systemRunCallId: lastCallId,
    attempts,
    stdout: lastStdout,
    stderr: lastStderr,
    durationMs: Date.now() - startedAt,
    artifacts: {
      targetWindow: parsedCall.canonicalArgs.targetWindow,
      platform: parsedCall.canonicalArgs.platform,
      stdoutBytes: lastArtifacts.stdoutBytes,
      stderrBytes: lastArtifacts.stderrBytes,
      stdoutTruncated: lastArtifacts.stdoutTruncated,
      stderrTruncated: lastArtifacts.stderrTruncated,
    },
  });
};
