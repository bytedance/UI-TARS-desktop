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

const WINDOW_FOCUS_TOOL_NAME = 'window.focus';
const WINDOW_FOCUS_TOOL_CALL_VERSION = 'v1';
const WINDOW_FOCUS_TOOL_RESULT_VERSION = 'v1';
const WINDOW_FOCUS_DEFAULT_TIMEOUT_MS = 8000;
const WINDOW_FOCUS_MAX_TIMEOUT_MS = 30000;

const SUPPORTED_PLATFORMS = ['win32', 'darwin'] as const;
const WINDOW_FOCUS_TARGETS = ['cursor', 'settings', 'notepad'] as const;

type WindowFocusTarget = (typeof WINDOW_FOCUS_TARGETS)[number];
type WindowFocusPlatform = (typeof SUPPORTED_PLATFORMS)[number];

type WindowFocusCatalogEntry = {
  displayName: string;
  focusArgvByPlatform: Partial<Record<WindowFocusPlatform, string[]>>;
};

const buildDarwinFocusArgv = (applicationName: string): string[] => {
  return [
    'osascript',
    '-e',
    `if application "${applicationName}" is running then tell application "${applicationName}" to activate else error "WINDOW_NOT_FOUND"`,
  ];
};

const WINDOW_FOCUS_CATALOG: Record<WindowFocusTarget, WindowFocusCatalogEntry> =
  {
    cursor: {
      displayName: 'Cursor',
      focusArgvByPlatform: {
        win32: [
          'powershell',
          '-NoProfile',
          '-Command',
          "$wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate('Cursor')) { exit 0 } else { exit 3 }",
        ],
        darwin: buildDarwinFocusArgv('Cursor'),
      },
    },
    settings: {
      displayName: 'System Settings',
      focusArgvByPlatform: {
        win32: [
          'powershell',
          '-NoProfile',
          '-Command',
          "$wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate('Settings')) { exit 0 } else { exit 3 }",
        ],
        darwin: buildDarwinFocusArgv('System Settings'),
      },
    },
    notepad: {
      displayName: 'Notepad',
      focusArgvByPlatform: {
        win32: [
          'powershell',
          '-NoProfile',
          '-Command',
          "$wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate('Notepad')) { exit 0 } else { exit 3 }",
        ],
        darwin: buildDarwinFocusArgv('TextEdit'),
      },
    },
  };

const WindowFocusInputSchema = z.object({
  intentId: z.string().min(1),
  targetWindow: z.enum(WINDOW_FOCUS_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS).optional(),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(WINDOW_FOCUS_MAX_TIMEOUT_MS)
    .default(WINDOW_FOCUS_DEFAULT_TIMEOUT_MS),
  idempotencyKey: z.string().min(1),
});

const WindowFocusCanonicalArgsSchema = z.object({
  targetWindow: z.enum(WINDOW_FOCUS_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS),
  argv: z.array(z.string()).min(1),
  timeoutMs: z.number().finite().positive().max(WINDOW_FOCUS_MAX_TIMEOUT_MS),
});

const WindowFocusToolCallSchema = z.object({
  version: z.literal(WINDOW_FOCUS_TOOL_CALL_VERSION),
  callId: z.string().min(1),
  intentId: z.string().min(1),
  toolName: z.literal(WINDOW_FOCUS_TOOL_NAME),
  toolVersion: z.string().min(1),
  canonicalArgs: WindowFocusCanonicalArgsSchema,
  idempotencyKey: z.string().min(1),
  timeoutMs: z.number().finite().positive().max(WINDOW_FOCUS_MAX_TIMEOUT_MS),
});

const WindowFocusToolResultSchema = z.object({
  version: z.literal(WINDOW_FOCUS_TOOL_RESULT_VERSION),
  callId: z.string().min(1),
  toolName: z.literal(WINDOW_FOCUS_TOOL_NAME),
  toolVersion: z.string().min(1),
  status: z.enum(['ok', 'error', 'timeout']),
  errorClass: z.enum([
    'none',
    'validation_error',
    'unsupported_target',
    'window_not_found',
    'spawn_error',
    'timeout',
    'non_zero_exit',
  ]),
  focused: z.boolean(),
  systemRunCallId: z.string().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().finite().nonnegative(),
  artifacts: z.object({
    targetWindow: z.enum(WINDOW_FOCUS_TARGETS).nullable(),
    platform: z.enum(SUPPORTED_PLATFORMS).nullable(),
    stdoutBytes: z.number().int().nonnegative(),
    stderrBytes: z.number().int().nonnegative(),
    stdoutTruncated: z.boolean(),
    stderrTruncated: z.boolean(),
  }),
});

export type WindowFocusToolCallV1 = z.infer<typeof WindowFocusToolCallSchema>;
export type WindowFocusToolResultV1 = z.infer<
  typeof WindowFocusToolResultSchema
>;

type WindowFocusExecutionOptions = {
  runSystemRun?: (call: SystemRunToolCallV1) => Promise<SystemRunToolResultV1>;
};

const resolvePlatform = (platform?: string): WindowFocusPlatform => {
  if (
    platform &&
    SUPPORTED_PLATFORMS.includes(platform as WindowFocusPlatform)
  ) {
    return platform as WindowFocusPlatform;
  }

  const hostPlatform = process.platform;
  if (SUPPORTED_PLATFORMS.includes(hostPlatform as WindowFocusPlatform)) {
    return hostPlatform as WindowFocusPlatform;
  }

  throw new Error(
    `[WINDOW_FOCUS_UNSUPPORTED_PLATFORM] platform=${hostPlatform}`,
  );
};

const resolveFocusArgv = (
  targetWindow: WindowFocusTarget,
  platform: WindowFocusPlatform,
): string[] | null => {
  const byPlatform =
    WINDOW_FOCUS_CATALOG[targetWindow]?.focusArgvByPlatform || {};
  const argv = byPlatform[platform];
  return Array.isArray(argv) && argv.length > 0 ? [...argv] : null;
};

const isWindowNotFoundExit = (
  platform: WindowFocusPlatform,
  result: SystemRunToolResultV1,
): boolean => {
  if (result.errorClass !== 'non_zero_exit') {
    return false;
  }

  if (platform === 'win32') {
    return result.exitCode === 3;
  }

  if (platform === 'darwin') {
    return result.stderr.includes('WINDOW_NOT_FOUND');
  }

  return false;
};

export const buildWindowFocusToolCall = (params: {
  intentId: string;
  targetWindow: WindowFocusTarget;
  platform?: WindowFocusPlatform;
  timeoutMs?: number;
  idempotencyKey: string;
}): WindowFocusToolCallV1 => {
  const parsed = WindowFocusInputSchema.parse(params);
  const platform = resolvePlatform(parsed.platform);
  const argv = resolveFocusArgv(parsed.targetWindow, platform);

  if (!argv) {
    throw new Error(
      `[WINDOW_FOCUS_UNSUPPORTED_TARGET] target=${parsed.targetWindow} platform=${platform}`,
    );
  }

  return WindowFocusToolCallSchema.parse({
    version: WINDOW_FOCUS_TOOL_CALL_VERSION,
    callId: randomUUID(),
    intentId: parsed.intentId,
    toolName: WINDOW_FOCUS_TOOL_NAME,
    toolVersion: TOOL_REGISTRY_VERSION,
    canonicalArgs: {
      targetWindow: parsed.targetWindow,
      platform,
      argv,
      timeoutMs: parsed.timeoutMs,
    },
    idempotencyKey: parsed.idempotencyKey,
    timeoutMs: parsed.timeoutMs,
  });
};

export const runWindowFocusToolCall = async (
  call: WindowFocusToolCallV1,
  options?: WindowFocusExecutionOptions,
): Promise<WindowFocusToolResultV1> => {
  const startedAt = Date.now();
  const runSystem = options?.runSystemRun ?? runSystemRunToolCall;

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

  const parsedCallResult = WindowFocusToolCallSchema.safeParse(call);
  if (!parsedCallResult.success) {
    return WindowFocusToolResultSchema.parse({
      version: WINDOW_FOCUS_TOOL_RESULT_VERSION,
      callId: fallbackCallId,
      toolName: WINDOW_FOCUS_TOOL_NAME,
      toolVersion: fallbackToolVersion,
      status: 'error',
      errorClass: 'validation_error',
      focused: false,
      systemRunCallId: null,
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
  const argv = resolveFocusArgv(
    parsedCall.canonicalArgs.targetWindow,
    parsedCall.canonicalArgs.platform,
  );
  if (!argv) {
    return WindowFocusToolResultSchema.parse({
      version: WINDOW_FOCUS_TOOL_RESULT_VERSION,
      callId: parsedCall.callId,
      toolName: parsedCall.toolName,
      toolVersion: parsedCall.toolVersion,
      status: 'error',
      errorClass: 'unsupported_target',
      focused: false,
      systemRunCallId: null,
      stdout: '',
      stderr: `[WINDOW_FOCUS_UNSUPPORTED_TARGET] target=${parsedCall.canonicalArgs.targetWindow} platform=${parsedCall.canonicalArgs.platform}`,
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

  const systemRunCall = buildSystemRunToolCall({
    intentId: parsedCall.intentId,
    argv,
    timeoutMs: parsedCall.canonicalArgs.timeoutMs,
    idempotencyKey: `${parsedCall.idempotencyKey}:window.focus:${parsedCall.canonicalArgs.targetWindow}`,
  });

  let systemRunResult: SystemRunToolResultV1;
  try {
    systemRunResult = await runSystem(systemRunCall);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return WindowFocusToolResultSchema.parse({
      version: WINDOW_FOCUS_TOOL_RESULT_VERSION,
      callId: parsedCall.callId,
      toolName: parsedCall.toolName,
      toolVersion: parsedCall.toolVersion,
      status: 'error',
      errorClass: 'spawn_error',
      focused: false,
      systemRunCallId: systemRunCall.callId,
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

  const status = systemRunResult.status;
  const notFoundExit = isWindowNotFoundExit(
    parsedCall.canonicalArgs.platform,
    systemRunResult,
  );
  const errorClass =
    systemRunResult.errorClass === 'none'
      ? 'none'
      : systemRunResult.errorClass === 'timeout'
        ? 'timeout'
        : systemRunResult.errorClass === 'non_zero_exit'
          ? notFoundExit
            ? 'window_not_found'
            : 'non_zero_exit'
          : systemRunResult.errorClass === 'validation_error'
            ? 'validation_error'
            : 'spawn_error';

  return WindowFocusToolResultSchema.parse({
    version: WINDOW_FOCUS_TOOL_RESULT_VERSION,
    callId: parsedCall.callId,
    toolName: parsedCall.toolName,
    toolVersion: parsedCall.toolVersion,
    status,
    errorClass,
    focused: status === 'ok',
    systemRunCallId: systemRunResult.callId,
    stdout: systemRunResult.stdout,
    stderr: systemRunResult.stderr,
    durationMs: Date.now() - startedAt,
    artifacts: {
      targetWindow: parsedCall.canonicalArgs.targetWindow,
      platform: parsedCall.canonicalArgs.platform,
      stdoutBytes: systemRunResult.artifacts.stdoutBytes,
      stderrBytes: systemRunResult.artifacts.stderrBytes,
      stdoutTruncated: systemRunResult.artifacts.stdoutTruncated,
      stderrTruncated: systemRunResult.artifacts.stderrTruncated,
    },
  });
};
