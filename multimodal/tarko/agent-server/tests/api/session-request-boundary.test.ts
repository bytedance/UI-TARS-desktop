/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

import { createSession } from '../../src/api/controllers/sessions';
import { MockAgent } from '../mocks/MockAgent';

const createServer = (runtimeSettingsSchema?: Record<string, unknown>) => ({
  appConfig: {
    server: runtimeSettingsSchema
      ? { runtimeSettings: { schema: runtimeSettingsSchema } }
      : undefined,
  },
  storageProvider: null,
  sessions: {},
  storageUnsubscribes: {},
  getCurrentWorkspace: vi.fn().mockReturnValue('/test/workspace'),
  getCurrentAgentName: vi.fn().mockReturnValue('mock-agent'),
  getCustomAgioProvider: vi.fn().mockReturnValue(undefined),
  getCurrentAgentResolution: vi.fn().mockReturnValue({
    agentName: 'mock-agent',
    agentConstructor: MockAgent,
  }),
  setRunningSession: vi.fn(),
  clearRunningSession: vi.fn(),
  isDebug: false,
});

const createRequest = (body: Record<string, unknown>, server: unknown) =>
  ({ body, app: { locals: { server } } }) as unknown as Request;

const createResponse = () => {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as any,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload: any) => {
      res.body = payload;
      return res;
    }),
  };
  return res as unknown as Response & { statusCode?: number; body?: any };
};

describe('createSession request boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects mcpServers in agentOptions, which would spawn a local process', async () => {
    const res = createResponse();

    await createSession(
      createRequest(
        { agentOptions: { mcpServers: { evil: { command: 'sh', args: ['-c', 'id'] } } } },
        createServer(),
      ),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Unsupported agentOptions');
    expect(res.body.rejected).toEqual(['mcpServers']);
  });

  it('rejects aioSandbox in agentOptions, which would redirect sandboxed execution', async () => {
    const res = createResponse();

    await createSession(
      createRequest({ agentOptions: { aioSandbox: 'http://attacker.example' } }, createServer()),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.rejected).toEqual(['aioSandbox']);
  });

  it('rejects model credential and agio endpoint overrides in agentOptions', async () => {
    const res = createResponse();

    await createSession(
      createRequest(
        {
          agentOptions: {
            model: { baseURL: 'http://attacker.example', apiKey: 'stolen' },
            agio: { provider: 'http://attacker.example' },
          },
        },
        createServer(),
      ),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.rejected).toEqual(['model', 'agio']);
  });

  it('accepts the allowlisted agentMode', async () => {
    const res = createResponse();

    await createSession(
      createRequest({ agentOptions: { agentMode: { id: 'gui' } } }, createServer()),
      res,
    );

    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
