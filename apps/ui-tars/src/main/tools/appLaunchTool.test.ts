/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import {
  type AppLaunchToolCallV1,
  buildAppLaunchToolCall,
  runAppLaunchToolCall,
} from './appLaunchTool';

describe('appLaunchTool', () => {
  it('builds deterministic app.launch call for a supported target', () => {
    const call = buildAppLaunchToolCall({
      intentId: 'intent-1',
      targetApp: 'settings',
      platform: 'win32',
      idempotencyKey: 'idem-1',
    });

    expect(call.toolName).toBe('app.launch');
    expect(call.canonicalArgs.targetApp).toBe('settings');
    expect(call.canonicalArgs.argv).toEqual([
      'powershell',
      '-NoProfile',
      '-Command',
      'Start-Process',
      'ms-settings:',
    ]);
  });

  it('launches notepad on win32 via Start-Process wrapper', () => {
    const call = buildAppLaunchToolCall({
      intentId: 'intent-1a',
      targetApp: 'notepad',
      platform: 'win32',
      idempotencyKey: 'idem-1a',
    });

    expect(call.canonicalArgs.argv).toEqual([
      'powershell',
      '-NoProfile',
      '-Command',
      'Start-Process',
      'notepad.exe',
    ]);
  });

  it('rejects unsupported target/platform combinations', () => {
    expect(() =>
      buildAppLaunchToolCall({
        intentId: 'intent-2',
        targetApp: 'cursor',
        platform: 'linux',
        idempotencyKey: 'idem-2',
      }),
    ).toThrow('[APP_LAUNCH_UNSUPPORTED_TARGET]');
  });

  it('maps successful system.run execution to launched=true', async () => {
    const call = buildAppLaunchToolCall({
      intentId: 'intent-3',
      targetApp: 'settings',
      platform: 'win32',
      idempotencyKey: 'idem-3',
    });

    const result = await runAppLaunchToolCall(call, {
      runSystemRun: vi.fn().mockResolvedValue({
        version: 'v1',
        callId: 'sys-call-1',
        toolName: 'system.run',
        toolVersion: '1.0.0',
        status: 'ok',
        errorClass: 'none',
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        durationMs: 15,
        deltaObserved: true,
        artifacts: {
          stdoutBytes: 2,
          stderrBytes: 0,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      }),
    });

    expect(result.status).toBe('ok');
    expect(result.errorClass).toBe('none');
    expect(result.launched).toBe(true);
    expect(result.systemRunCallId).toBe('sys-call-1');
  });

  it('maps timeout from system.run to timeout result', async () => {
    const call = buildAppLaunchToolCall({
      intentId: 'intent-4',
      targetApp: 'settings',
      platform: 'win32',
      idempotencyKey: 'idem-4',
    });

    const result = await runAppLaunchToolCall(call, {
      runSystemRun: vi.fn().mockResolvedValue({
        version: 'v1',
        callId: 'sys-call-2',
        toolName: 'system.run',
        toolVersion: '1.0.0',
        status: 'timeout',
        errorClass: 'timeout',
        exitCode: null,
        stdout: '',
        stderr: 'timeout',
        durationMs: 100,
        deltaObserved: false,
        artifacts: {
          stdoutBytes: 0,
          stderrBytes: 7,
          stdoutTruncated: false,
          stderrTruncated: false,
        },
      }),
    });

    expect(result.status).toBe('timeout');
    expect(result.errorClass).toBe('timeout');
    expect(result.launched).toBe(false);
  });

  it('returns validation_error for malformed app.launch call', async () => {
    const result = await runAppLaunchToolCall({} as AppLaunchToolCallV1);

    expect(result.status).toBe('error');
    expect(result.errorClass).toBe('validation_error');
    expect(result.launched).toBe(false);
  });
});
