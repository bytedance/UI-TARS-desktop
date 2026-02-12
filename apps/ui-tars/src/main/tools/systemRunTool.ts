/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

import { z } from 'zod';

import { TOOL_REGISTRY_VERSION } from './toolRegistry';

const SYSTEM_RUN_TOOL_NAME = 'system.run';
const SYSTEM_RUN_TOOL_CALL_VERSION = 'v1';
const SYSTEM_RUN_TOOL_RESULT_VERSION = 'v1';
const SYSTEM_RUN_DEFAULT_TIMEOUT_MS = 15000;
const SYSTEM_RUN_MAX_TIMEOUT_MS = 60000;
const SYSTEM_RUN_MAX_OUTPUT_BYTES = 64 * 1024;
const SYSTEM_RUN_HARD_KILL_GRACE_MS = 500;
const SYSTEM_RUN_FORCE_RESOLVE_GRACE_MS = 1500;

const SystemRunInputSchema = z.object({
  intentId: z.string().min(1),
  argv: z.array(z.string().min(1)).min(1),
  cwd: z.string().min(1).optional(),
  timeoutMs: z
    .number()
    .finite()
    .positive()
    .max(SYSTEM_RUN_MAX_TIMEOUT_MS)
    .default(SYSTEM_RUN_DEFAULT_TIMEOUT_MS),
  idempotencyKey: z.string().min(1),
});

const SystemRunCanonicalArgsSchema = z.object({
  argv: z.array(z.string().min(1)).min(1),
  cwd: z.string().min(1).optional(),
  timeoutMs: z.number().finite().positive().max(SYSTEM_RUN_MAX_TIMEOUT_MS),
});

const SystemRunToolCallSchema = z.object({
  version: z.literal(SYSTEM_RUN_TOOL_CALL_VERSION),
  callId: z.string().min(1),
  intentId: z.string().min(1),
  toolName: z.literal(SYSTEM_RUN_TOOL_NAME),
  toolVersion: z.string().min(1),
  canonicalArgs: SystemRunCanonicalArgsSchema,
  idempotencyKey: z.string().min(1),
  timeoutMs: z.number().finite().positive().max(SYSTEM_RUN_MAX_TIMEOUT_MS),
});

const SystemRunToolResultSchema = z.object({
  version: z.literal(SYSTEM_RUN_TOOL_RESULT_VERSION),
  callId: z.string().min(1),
  toolName: z.literal(SYSTEM_RUN_TOOL_NAME),
  toolVersion: z.string().min(1),
  status: z.enum(['ok', 'error', 'timeout']),
  errorClass: z.enum([
    'none',
    'validation_error',
    'policy_error',
    'spawn_error',
    'timeout',
    'non_zero_exit',
  ]),
  exitCode: z.number().int().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().finite().nonnegative(),
  deltaObserved: z.boolean(),
  artifacts: z.object({
    stdoutBytes: z.number().int().nonnegative(),
    stderrBytes: z.number().int().nonnegative(),
    stdoutTruncated: z.boolean(),
    stderrTruncated: z.boolean(),
  }),
});

export type SystemRunToolCallV1 = z.infer<typeof SystemRunToolCallSchema>;
export type SystemRunToolResultV1 = z.infer<typeof SystemRunToolResultSchema>;

type SystemRunExecutionOptions = {
  spawnImpl?: typeof spawn;
  hardKillGraceMs?: number;
  forceResolveGraceMs?: number;
};

const normalizeArgv = (argv: string[]): string[] => {
  return argv.map((item) => item.trim()).filter((item) => item.length > 0);
};

export const buildSystemRunToolCall = (params: {
  intentId: string;
  argv: string[];
  cwd?: string;
  timeoutMs?: number;
  idempotencyKey: string;
}): SystemRunToolCallV1 => {
  const parsed = SystemRunInputSchema.parse(params);
  const canonicalArgv = normalizeArgv(parsed.argv);

  if (canonicalArgv.length === 0) {
    throw new Error('[SYSTEM_RUN_INVALID_ARGS] argv must include command');
  }

  return SystemRunToolCallSchema.parse({
    version: SYSTEM_RUN_TOOL_CALL_VERSION,
    callId: randomUUID(),
    intentId: parsed.intentId,
    toolName: SYSTEM_RUN_TOOL_NAME,
    toolVersion: TOOL_REGISTRY_VERSION,
    canonicalArgs: {
      argv: canonicalArgv,
      cwd: parsed.cwd,
      timeoutMs: parsed.timeoutMs,
    },
    idempotencyKey: parsed.idempotencyKey,
    timeoutMs: parsed.timeoutMs,
  });
};

const pushChunk = (
  chunks: Buffer[],
  chunk: Buffer,
  currentBytes: number,
): { bytes: number; truncated: boolean } => {
  const remaining = SYSTEM_RUN_MAX_OUTPUT_BYTES - currentBytes;
  if (remaining <= 0) {
    return { bytes: currentBytes, truncated: true };
  }

  if (chunk.length > remaining) {
    chunks.push(chunk.subarray(0, remaining));
    return { bytes: currentBytes + remaining, truncated: true };
  }

  chunks.push(chunk);
  return { bytes: currentBytes + chunk.length, truncated: false };
};

export const runSystemRunToolCall = async (
  call: SystemRunToolCallV1,
  options?: SystemRunExecutionOptions,
): Promise<SystemRunToolResultV1> => {
  const parsedCall = SystemRunToolCallSchema.parse(call);
  const startedAt = Date.now();
  const spawnImpl = options?.spawnImpl ?? spawn;
  const hardKillGraceMs =
    typeof options?.hardKillGraceMs === 'number' &&
    Number.isFinite(options.hardKillGraceMs) &&
    options.hardKillGraceMs >= 0
      ? options.hardKillGraceMs
      : SYSTEM_RUN_HARD_KILL_GRACE_MS;
  const forceResolveGraceMs =
    typeof options?.forceResolveGraceMs === 'number' &&
    Number.isFinite(options.forceResolveGraceMs) &&
    options.forceResolveGraceMs >= 0
      ? options.forceResolveGraceMs
      : SYSTEM_RUN_FORCE_RESOLVE_GRACE_MS;

  const [command, ...args] = parsedCall.canonicalArgs.argv;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stdoutTruncated = false;
  let stderrTruncated = false;

  const readStdout = () => Buffer.concat(stdoutChunks).toString('utf8');
  const readStderr = () => Buffer.concat(stderrChunks).toString('utf8');
  const withNote = (stderr: string, note: string) => {
    return stderr ? `${stderr}\n${note}` : note;
  };

  return await new Promise<SystemRunToolResultV1>((resolve) => {
    let settled = false;
    let timedOut = false;
    let timedOutWithoutClose = false;

    let timeoutHandle: NodeJS.Timeout | null = null;
    let hardKillHandle: NodeJS.Timeout | null = null;
    let forceResolveHandle: NodeJS.Timeout | null = null;

    const clearHandles = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      if (hardKillHandle) {
        clearTimeout(hardKillHandle);
        hardKillHandle = null;
      }
      if (forceResolveHandle) {
        clearTimeout(forceResolveHandle);
        forceResolveHandle = null;
      }
    };

    const resolveOnce = (result: SystemRunToolResultV1) => {
      if (settled) {
        return;
      }
      settled = true;
      clearHandles();
      resolve(result);
    };

    const toResult = (params: {
      status: 'ok' | 'error' | 'timeout';
      errorClass:
        | 'none'
        | 'validation_error'
        | 'policy_error'
        | 'spawn_error'
        | 'timeout'
        | 'non_zero_exit';
      exitCode: number | null;
      stdout: string;
      stderr: string;
      deltaObserved: boolean;
    }): SystemRunToolResultV1 => {
      return SystemRunToolResultSchema.parse({
        version: SYSTEM_RUN_TOOL_RESULT_VERSION,
        callId: parsedCall.callId,
        toolName: parsedCall.toolName,
        toolVersion: parsedCall.toolVersion,
        status: params.status,
        errorClass: params.errorClass,
        exitCode: params.exitCode,
        stdout: params.stdout,
        stderr: params.stderr,
        durationMs: Date.now() - startedAt,
        deltaObserved: params.deltaObserved,
        artifacts: {
          stdoutBytes,
          stderrBytes,
          stdoutTruncated,
          stderrTruncated,
        },
      });
    };

    const child = spawnImpl(command, args, {
      cwd: parsedCall.canonicalArgs.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!child.stdout || !child.stderr) {
      resolveOnce(
        toResult({
          status: 'error',
          errorClass: 'spawn_error',
          exitCode: null,
          stdout: '',
          stderr:
            '[SYSTEM_RUN_SPAWN_ERROR] stdout/stderr streams are unavailable',
          deltaObserved: false,
        }),
      );
      return;
    }

    timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill();
      hardKillHandle = setTimeout(() => {
        child.kill('SIGKILL');
      }, hardKillGraceMs);
      forceResolveHandle = setTimeout(() => {
        timedOutWithoutClose = true;
        resolveOnce(
          toResult({
            status: 'timeout',
            errorClass: 'timeout',
            exitCode: null,
            stdout: readStdout(),
            stderr: withNote(
              readStderr(),
              '[SYSTEM_RUN_TIMEOUT] Process did not close after SIGTERM/SIGKILL fallback',
            ),
            deltaObserved: false,
          }),
        );
      }, hardKillGraceMs + forceResolveGraceMs);
    }, parsedCall.timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const pushed = pushChunk(stdoutChunks, data, stdoutBytes);
      stdoutBytes = pushed.bytes;
      stdoutTruncated = stdoutTruncated || pushed.truncated;
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const pushed = pushChunk(stderrChunks, data, stderrBytes);
      stderrBytes = pushed.bytes;
      stderrTruncated = stderrTruncated || pushed.truncated;
    });

    child.once('error', (error) => {
      resolveOnce(
        toResult({
          status: 'error',
          errorClass: 'spawn_error',
          exitCode: null,
          stdout: '',
          stderr: error.message,
          deltaObserved: false,
        }),
      );
    });

    child.once('close', (code) => {
      const stdout = readStdout();
      const stderr = readStderr();

      if (timedOut) {
        resolveOnce(
          toResult({
            status: 'timeout',
            errorClass: 'timeout',
            exitCode: null,
            stdout,
            stderr: timedOutWithoutClose
              ? withNote(
                  stderr,
                  '[SYSTEM_RUN_TIMEOUT] close event arrived after forced timeout resolution',
                )
              : stderr,
            deltaObserved: false,
          }),
        );
        return;
      }

      const exitCode = typeof code === 'number' ? code : null;
      const success = exitCode === 0;

      resolveOnce(
        toResult({
          status: success ? 'ok' : 'error',
          errorClass: success ? 'none' : 'non_zero_exit',
          exitCode,
          stdout,
          stderr,
          deltaObserved: success,
        }),
      );
    });
  });
};
