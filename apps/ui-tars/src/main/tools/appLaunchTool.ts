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

const APP_LAUNCH_TOOL_NAME = 'app.launch';
const APP_LAUNCH_TOOL_CALL_VERSION = 'v1';
const APP_LAUNCH_TOOL_RESULT_VERSION = 'v1';
const APP_LAUNCH_DEFAULT_TIMEOUT_MS = 20000;
const APP_LAUNCH_MAX_TIMEOUT_MS = 60000;

const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'] as const;
const APP_LAUNCH_TARGETS = ['cursor', 'settings', 'notepad'] as const;

type AppLaunchTarget = (typeof APP_LAUNCH_TARGETS)[number];
type AppLaunchPlatform = (typeof SUPPORTED_PLATFORMS)[number];

type AppLaunchCatalogEntry = {
  displayName: string;
  argvByPlatform: Partial<Record<AppLaunchPlatform, string[]>>;
};

const APP_LAUNCH_CATALOG: Record<AppLaunchTarget, AppLaunchCatalogEntry> = {
  cursor: {
    displayName: 'Cursor',
    argvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        'Start-Process',
        'cursor',
      ],
      darwin: ['open', '-a', 'Cursor'],
    },
  },
  settings: {
    displayName: 'System Settings',
    argvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        'Start-Process',
        'ms-settings:',
      ],
      darwin: ['open', 'x-apple.systempreferences:'],
      linux: ['gnome-control-center'],
    },
  },
  notepad: {
    displayName: 'Notepad',
    argvByPlatform: {
      win32: [
        'powershell',
        '-NoProfile',
        '-Command',
        'Start-Process',
        'notepad.exe',
      ],
      darwin: ['open', '-a', 'TextEdit'],
      linux: ['gedit'],
    },
  },
};

const AppLaunchInputSchema = z.object({
  intentId: z.string().min(1),
  targetApp: z.enum(APP_LAUNCH_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS).optional(),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(APP_LAUNCH_MAX_TIMEOUT_MS)
    .default(APP_LAUNCH_DEFAULT_TIMEOUT_MS),
  idempotencyKey: z.string().min(1),
});

const AppLaunchCanonicalArgsSchema = z.object({
  targetApp: z.enum(APP_LAUNCH_TARGETS),
  platform: z.enum(SUPPORTED_PLATFORMS),
  argv: z.array(z.string()).min(1),
  timeoutMs: z.number().finite().positive().max(APP_LAUNCH_MAX_TIMEOUT_MS),
});

const AppLaunchToolCallSchema = z.object({
  version: z.literal(APP_LAUNCH_TOOL_CALL_VERSION),
  callId: z.string().min(1),
  intentId: z.string().min(1),
  toolName: z.literal(APP_LAUNCH_TOOL_NAME),
  toolVersion: z.string().min(1),
  canonicalArgs: AppLaunchCanonicalArgsSchema,
  idempotencyKey: z.string().min(1),
  timeoutMs: z.number().finite().positive().max(APP_LAUNCH_MAX_TIMEOUT_MS),
});

const AppLaunchToolResultSchema = z.object({
  version: z.literal(APP_LAUNCH_TOOL_RESULT_VERSION),
  callId: z.string().min(1),
  toolName: z.literal(APP_LAUNCH_TOOL_NAME),
  toolVersion: z.string().min(1),
  status: z.enum(['ok', 'error', 'timeout']),
  errorClass: z.enum([
    'none',
    'validation_error',
    'unsupported_target',
    'spawn_error',
    'timeout',
    'non_zero_exit',
  ]),
  launched: z.boolean(),
  systemRunCallId: z.string().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().finite().nonnegative(),
  artifacts: z.object({
    targetApp: z.enum(APP_LAUNCH_TARGETS).nullable(),
    platform: z.enum(SUPPORTED_PLATFORMS).nullable(),
    stdoutBytes: z.number().int().nonnegative(),
    stderrBytes: z.number().int().nonnegative(),
    stdoutTruncated: z.boolean(),
    stderrTruncated: z.boolean(),
  }),
});

export type AppLaunchToolCallV1 = z.infer<typeof AppLaunchToolCallSchema>;
export type AppLaunchToolResultV1 = z.infer<typeof AppLaunchToolResultSchema>;

type AppLaunchExecutionOptions = {
  runSystemRun?: (call: SystemRunToolCallV1) => Promise<SystemRunToolResultV1>;
};

const resolvePlatform = (platform?: string): AppLaunchPlatform => {
  const fallback = process.platform;
  const candidate = platform || fallback;
  if (SUPPORTED_PLATFORMS.includes(candidate as AppLaunchPlatform)) {
    return candidate as AppLaunchPlatform;
  }
  return 'win32';
};

const resolveLaunchArgv = (
  targetApp: AppLaunchTarget,
  platform: AppLaunchPlatform,
): string[] | null => {
  const byPlatform = APP_LAUNCH_CATALOG[targetApp]?.argvByPlatform || {};
  const argv = byPlatform[platform];
  return Array.isArray(argv) && argv.length > 0 ? [...argv] : null;
};

export const buildAppLaunchToolCall = (params: {
  intentId: string;
  targetApp: AppLaunchTarget;
  platform?: AppLaunchPlatform;
  timeoutMs?: number;
  idempotencyKey: string;
}): AppLaunchToolCallV1 => {
  const parsed = AppLaunchInputSchema.parse(params);
  const platform = resolvePlatform(parsed.platform);
  const argv = resolveLaunchArgv(parsed.targetApp, platform);

  if (!argv) {
    throw new Error(
      `[APP_LAUNCH_UNSUPPORTED_TARGET] target=${parsed.targetApp} platform=${platform}`,
    );
  }

  return AppLaunchToolCallSchema.parse({
    version: APP_LAUNCH_TOOL_CALL_VERSION,
    callId: randomUUID(),
    intentId: parsed.intentId,
    toolName: APP_LAUNCH_TOOL_NAME,
    toolVersion: TOOL_REGISTRY_VERSION,
    canonicalArgs: {
      targetApp: parsed.targetApp,
      platform,
      argv,
      timeoutMs: parsed.timeoutMs,
    },
    idempotencyKey: parsed.idempotencyKey,
    timeoutMs: parsed.timeoutMs,
  });
};

export const runAppLaunchToolCall = async (
  call: AppLaunchToolCallV1,
  options?: AppLaunchExecutionOptions,
): Promise<AppLaunchToolResultV1> => {
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

  const parsedCallResult = AppLaunchToolCallSchema.safeParse(call);
  if (!parsedCallResult.success) {
    return AppLaunchToolResultSchema.parse({
      version: APP_LAUNCH_TOOL_RESULT_VERSION,
      callId: fallbackCallId,
      toolName: APP_LAUNCH_TOOL_NAME,
      toolVersion: fallbackToolVersion,
      status: 'error',
      errorClass: 'validation_error',
      launched: false,
      systemRunCallId: null,
      stdout: '',
      stderr: parsedCallResult.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
      durationMs: Date.now() - startedAt,
      artifacts: {
        targetApp: null,
        platform: null,
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });
  }

  const parsedCall = parsedCallResult.data;
  const argv = resolveLaunchArgv(
    parsedCall.canonicalArgs.targetApp,
    parsedCall.canonicalArgs.platform,
  );
  if (!argv) {
    return AppLaunchToolResultSchema.parse({
      version: APP_LAUNCH_TOOL_RESULT_VERSION,
      callId: parsedCall.callId,
      toolName: parsedCall.toolName,
      toolVersion: parsedCall.toolVersion,
      status: 'error',
      errorClass: 'unsupported_target',
      launched: false,
      systemRunCallId: null,
      stdout: '',
      stderr: `[APP_LAUNCH_UNSUPPORTED_TARGET] target=${parsedCall.canonicalArgs.targetApp} platform=${parsedCall.canonicalArgs.platform}`,
      durationMs: Date.now() - startedAt,
      artifacts: {
        targetApp: parsedCall.canonicalArgs.targetApp,
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
    idempotencyKey: `${parsedCall.idempotencyKey}:app.launch:${parsedCall.canonicalArgs.targetApp}`,
  });

  let systemRunResult: SystemRunToolResultV1;
  try {
    systemRunResult = await runSystem(systemRunCall);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return AppLaunchToolResultSchema.parse({
      version: APP_LAUNCH_TOOL_RESULT_VERSION,
      callId: parsedCall.callId,
      toolName: parsedCall.toolName,
      toolVersion: parsedCall.toolVersion,
      status: 'error',
      errorClass: 'spawn_error',
      launched: false,
      systemRunCallId: systemRunCall.callId,
      stdout: '',
      stderr: message,
      durationMs: Date.now() - startedAt,
      artifacts: {
        targetApp: parsedCall.canonicalArgs.targetApp,
        platform: parsedCall.canonicalArgs.platform,
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    });
  }

  const status = systemRunResult.status;
  const errorClass =
    systemRunResult.errorClass === 'none'
      ? 'none'
      : systemRunResult.errorClass === 'timeout'
        ? 'timeout'
        : systemRunResult.errorClass === 'non_zero_exit'
          ? 'non_zero_exit'
          : systemRunResult.errorClass === 'validation_error'
            ? 'validation_error'
            : 'spawn_error';

  return AppLaunchToolResultSchema.parse({
    version: APP_LAUNCH_TOOL_RESULT_VERSION,
    callId: parsedCall.callId,
    toolName: parsedCall.toolName,
    toolVersion: parsedCall.toolVersion,
    status,
    errorClass,
    launched: status === 'ok',
    systemRunCallId: systemRunResult.callId,
    stdout: systemRunResult.stdout,
    stderr: systemRunResult.stderr,
    durationMs: Date.now() - startedAt,
    artifacts: {
      targetApp: parsedCall.canonicalArgs.targetApp,
      platform: parsedCall.canonicalArgs.platform,
      stdoutBytes: systemRunResult.artifacts.stdoutBytes,
      stderrBytes: systemRunResult.artifacts.stderrBytes,
      stdoutTruncated: systemRunResult.artifacts.stdoutTruncated,
      stderrTruncated: systemRunResult.artifacts.stderrTruncated,
    },
  });
};
