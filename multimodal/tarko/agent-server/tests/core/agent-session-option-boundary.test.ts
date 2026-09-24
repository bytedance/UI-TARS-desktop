/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentSession } from '../../src/core/AgentSession';
import { MemoryStorageProvider } from '../../src/storage/MemoryStorageProvider';
import { MockAgent } from '../mocks/MockAgent';
import { AgentServer } from '../../src/server';
import { SessionInfo } from '@tarko/interface';

/**
 * The options a session hands to the Agent constructor are the boundary that keeps
 * a request from reconfiguring the Agent. These tests pin that boundary down by
 * capturing the constructor argument.
 */
describe('AgentSession - agent option boundary', () => {
  let capturedOptions: Record<string, any>;
  let storageProvider: MemoryStorageProvider;
  let session: AgentSession;
  const sessionId = 'test-session-boundary';

  class CapturingAgent extends MockAgent {
    constructor(options: any) {
      super(options);
      capturedOptions = options;
    }
  }

  const buildServer = (appConfig: Record<string, any>): AgentServer =>
    ({
      storageProvider,
      appConfig,
      getCurrentAgentResolution: vi.fn().mockReturnValue({
        agentName: 'test-agent',
        agentConstructor: CapturingAgent,
      }),
      getCurrentAgentName: vi.fn().mockReturnValue('test-agent'),
      getCurrentWorkspace: vi.fn().mockReturnValue('/tmp/test'),
      setRunningSession: vi.fn(),
      clearRunningSession: vi.fn(),
      isDebug: false,
    }) as unknown as AgentServer;

  const createSessionInfo = async (metadata: SessionInfo['metadata'] = {}) =>
    storageProvider.createSession({
      id: sessionId,
      workspace: '/tmp/test',
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  beforeEach(async () => {
    capturedOptions = {};
    storageProvider = new MemoryStorageProvider();
    await storageProvider.initialize();
  });

  afterEach(async () => {
    if (session) {
      await session.cleanup();
    }
    if (storageProvider) {
      await storageProvider.close();
    }
  });

  it('drops mcpServers supplied as one-time agentOptions', async () => {
    const sessionInfo = await createSessionInfo();
    const server = buildServer({ workspace: '/tmp/test' });

    session = new AgentSession(server, sessionId, undefined, sessionInfo, {
      mcpServers: { evil: { command: 'sh', args: ['-c', 'id'] } },
    });
    await session.initialize();

    expect(capturedOptions.mcpServers).toBeUndefined();
  });

  it('drops mcpServers and aioSandbox supplied as undeclared runtimeSettings', async () => {
    const sessionInfo = await createSessionInfo({
      runtimeSettings: {
        mcpServers: { evil: { command: 'sh', args: ['-c', 'id'] } },
        aioSandbox: 'http://attacker.example',
      },
    } as SessionInfo['metadata']);
    const server = buildServer({ workspace: '/tmp/test' });

    session = new AgentSession(server, sessionId, undefined, sessionInfo);
    await session.initialize();

    expect(capturedOptions.mcpServers).toBeUndefined();
    expect(capturedOptions.aioSandbox).toBeUndefined();
  });

  it('keeps server configuration when a request supplies the same key', async () => {
    const sessionInfo = await createSessionInfo();
    const server = buildServer({
      workspace: '/tmp/test',
      aioSandbox: 'http://sandbox.internal',
    });

    session = new AgentSession(server, sessionId, undefined, sessionInfo, {
      aioSandbox: 'http://attacker.example',
      workspace: '/etc',
    });
    await session.initialize();

    expect(capturedOptions.aioSandbox).toBe('http://sandbox.internal');
    expect(capturedOptions.workspace).toBe('/tmp/test');
  });

  it('passes through the allowlisted agentMode', async () => {
    const sessionInfo = await createSessionInfo();
    const server = buildServer({ workspace: '/tmp/test' });
    const agentMode = { id: 'game', link: 'https://example.com/g', browserMode: 'hybrid' };

    session = new AgentSession(server, sessionId, undefined, sessionInfo, { agentMode });
    await session.initialize();

    expect(capturedOptions.agentMode).toEqual(agentMode);
  });

  it('passes through runtime settings the server declared', async () => {
    const sessionInfo = await createSessionInfo({
      runtimeSettings: { browserMode: 'hybrid', mcpServers: { evil: { command: 'sh' } } },
    } as SessionInfo['metadata']);
    const server = buildServer({
      workspace: '/tmp/test',
      server: { runtimeSettings: { schema: { properties: { browserMode: { type: 'string' } } } } },
    });

    session = new AgentSession(server, sessionId, undefined, sessionInfo);
    await session.initialize();

    expect(capturedOptions.browserMode).toBe('hybrid');
    expect(capturedOptions.mcpServers).toBeUndefined();
  });

  it('still lets a server-provided runtime settings transform shape agent options', async () => {
    const sessionInfo = await createSessionInfo({
      runtimeSettings: { mode: 'game' },
    } as SessionInfo['metadata']);
    const server = buildServer({
      workspace: '/tmp/test',
      server: {
        runtimeSettings: {
          schema: { properties: { mode: { type: 'string' } } },
          transform: (runtimeSettings: Record<string, unknown>) => ({
            agentMode: { id: runtimeSettings.mode },
          }),
        },
      },
    });

    session = new AgentSession(server, sessionId, undefined, sessionInfo);
    await session.initialize();

    expect(capturedOptions.agentMode).toEqual({ id: 'game' });
  });
});
