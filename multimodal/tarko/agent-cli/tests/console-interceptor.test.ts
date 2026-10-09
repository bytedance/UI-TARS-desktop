/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ConsoleInterceptor } from '../src/utils/console-interceptor';

const options = { silent: true, capture: true } as const;

const capture = async (
  write: () => void,
): Promise<{
  logs: string[];
  error?: unknown;
}> => {
  try {
    const { logs } = await ConsoleInterceptor.run(async () => {
      write();
      return null;
    }, options);
    return { logs };
  } catch (error) {
    return { logs: [], error };
  }
};

describe('ConsoleInterceptor - captured text', () => {
  it('keeps the message of an Error argument', async () => {
    const { logs, error } = await capture(() =>
      console.error('Failed to create session:', new Error('connect ECONNREFUSED 127.0.0.1:8000')),
    );

    expect(error).toBeUndefined();
    expect(logs).toHaveLength(1);
    expect(logs[0].startsWith('Failed to create session: Error:')).toBe(true);
    expect(logs[0]).toContain('connect ECONNREFUSED 127.0.0.1:8000');
  });

  it('renders an object payload the way the console does', async () => {
    const { logs } = await capture(() =>
      console.log('Return initializationEvents', [{ type: 'text', content: 'hello' }]),
    );

    expect(logs[0]).toBe("Return initializationEvents [ { type: 'text', content: 'hello' } ]");
  });

  it('captures a circular argument instead of throwing', async () => {
    const client: Record<string, unknown> = { name: 'mcp-client' };
    client.self = client;

    const { logs, error } = await capture(() => console.warn('client state:', client));

    expect(error).toBeUndefined();
    expect(logs[0]).toContain("name: 'mcp-client'");
    expect(logs[0]).toContain('[Circular');
  });

  it('resolves printf specifiers from the remaining arguments', async () => {
    const { logs } = await capture(() =>
      console.error('Error getting session details for %s:', 'sess-42'),
    );

    expect(logs[0]).toBe('Error getting session details for sess-42:');
  });

  it('renders undefined as the console does', async () => {
    const { logs } = await capture(() => console.log('value:', undefined));

    expect(logs[0]).toBe('value: undefined');
  });

  it('passes a string-only call through unchanged', async () => {
    const { logs } = await capture(() => console.log('Workspace: C:\\work\\demo'));

    expect(logs[0]).toBe('Workspace: C:\\work\\demo');
  });
});
