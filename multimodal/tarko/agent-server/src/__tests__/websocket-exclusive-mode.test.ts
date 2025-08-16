/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentServer } from '../server';
import { AgentAppConfig, LogLevel } from '@tarko/interface';
import { MockAgent } from './mocks/MockAgent';
import { MockAgioProvider } from './mocks/MockAgioProvider';

// Mock WebSocket client for testing
class MockSocketClient {
  private handlers: Record<string, Function[]> = {};
  private connected = false;
  
  constructor(private server: AgentServer) {}
  
  connect(): Promise<void> {
    return new Promise((resolve) => {
      this.connected = true;
      setTimeout(() => {
        this.emit('connect');
        resolve();
      }, 10);
    });
  }
  
  on(event: string, handler: Function) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }
  
  emit(event: string, data?: any) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
    
    // Simulate server responses
    if (event === 'get-server-status' && this.connected) {
      setTimeout(() => {
        const status = {
          isExclusive: this.server.isExclusive,
          runningSessionId: this.server.getRunningSessionId(),
          canAcceptNewRequest: this.server.canAcceptNewRequest(),
          activeSessions: Object.keys(this.server.sessions).length,
          sessionStatuses: Object.keys(this.server.sessions).reduce((acc, sessionId) => {
            const session = this.server.sessions[sessionId];
            acc[sessionId] = {
              isProcessing: session.getProcessingStatus(),
              state: session.agent.status(),
            };
            return acc;
          }, {} as Record<string, { isProcessing: boolean; state: string }>),
        };
        this.emit('server-status', status);
      }, 10);
    }
  }
  
  disconnect() {
    this.connected = false;
  }
}

describe('WebSocket Exclusive Mode', () => {
  let server: AgentServer;
  let httpServer: any;
  let clientSocket: MockSocketClient;
  let port: number;

  const createTestConfig = (exclusive: boolean): AgentAppConfig => ({
    agent: 'mock-agent',
    workspace: '/tmp/test-workspace',
    logLevel: LogLevel.DEBUG,
    server: {
      port: 0, // Use random port for testing
      exclusive,
    },
    model: {
      provider: 'openai',
      id: 'gpt-4',
      providers: [
        {
          name: 'openai',
          models: ['gpt-4', 'gpt-3.5-turbo'],
        },
      ],
    },
  });

  beforeEach(async () => {
    // Mock the agent resolver
    vi.doMock('../utils/agent-resolver', () => ({
      resolveAgentImplementation: vi.fn().mockResolvedValue({
        agentConstructor: MockAgent,
        agentName: 'mock-agent',
        agioProviderConstructor: MockAgioProvider,
      }),
    }));

    server = new AgentServer({
      appConfig: createTestConfig(true),
      directories: { globalWorkspaceDir: '/tmp' },
    });

    httpServer = await server.start();
    port = httpServer.address().port;
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (server) {
      await server.stop();
    }
    vi.clearAllMocks();
  });

  const connectClient = async (): Promise<MockSocketClient> => {
    const socket = new MockSocketClient(server);
    await socket.connect();
    return socket;
  };

  describe('Server Status WebSocket API', () => {
    it('should provide server status on request', async () => {
      clientSocket = await connectClient();

      const statusPromise = new Promise((resolve) => {
        clientSocket.on('server-status', resolve);
      });

      clientSocket.emit('get-server-status');

      const status = await statusPromise;
      expect(status).toMatchObject({
        isExclusive: true,
        runningSessionId: null,
        canAcceptNewRequest: true,
        activeSessions: 0,
        sessionStatuses: {},
      });
    });

    it('should show running session in status', async () => {
      clientSocket = await connectClient();
      const sessionId = 'test-session-123';

      // Create a mock session
      const mockSession = {
        getProcessingStatus: () => true,
        agent: { status: () => 'executing' },
      };
      server.sessions[sessionId] = mockSession as any;
      server.setRunningSession(sessionId);

      const statusPromise = new Promise((resolve) => {
        clientSocket.on('server-status', resolve);
      });

      clientSocket.emit('get-server-status');

      const status = await statusPromise;
      expect(status).toMatchObject({
        isExclusive: true,
        runningSessionId: sessionId,
        canAcceptNewRequest: false,
        activeSessions: 1,
        sessionStatuses: {
          [sessionId]: {
            isProcessing: true,
            state: 'executing',
          },
        },
      });
    });

    it('should broadcast status updates automatically in exclusive mode', async () => {
      clientSocket = await connectClient();
      const sessionId = 'auto-broadcast-session';

      // Listen for automatic broadcasts
      const statusUpdates: any[] = [];
      clientSocket.on('server-status-update', (status) => {
        statusUpdates.push(status);
      });

      // Create a mock session and set it as running
      const mockSession = {
        getProcessingStatus: () => true,
        agent: { status: () => 'executing' },
      };
      server.sessions[sessionId] = mockSession as any;
      server.setRunningSession(sessionId);

      // Wait for at least one broadcast
      await new Promise((resolve) => {
        const checkForUpdate = () => {
          if (statusUpdates.length > 0) {
            resolve(statusUpdates[0]);
          } else {
            setTimeout(checkForUpdate, 100);
          }
        };
        checkForUpdate();
      });

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0]).toMatchObject({
        isExclusive: true,
        runningSessionId: sessionId,
        canAcceptNewRequest: false,
        timestamp: expect.any(Number),
      });
    });

    it('should broadcast when session starts and ends', async () => {
      clientSocket = await connectClient();
      const sessionId = 'lifecycle-session';

      const statusUpdates: any[] = [];
      clientSocket.on('server-status-update', (status) => {
        statusUpdates.push(status);
      });

      // Start session
      server.setRunningSession(sessionId);

      // Wait for start broadcast
      await new Promise((resolve) => setTimeout(resolve, 50));

      // End session
      server.clearRunningSession(sessionId);

      // Wait for end broadcast
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(statusUpdates.length).toBeGreaterThanOrEqual(2);

      // Check that we got both start and end events
      const hasStartEvent = statusUpdates.some(
        (update) => update.runningSessionId === sessionId
      );
      const hasEndEvent = statusUpdates.some(
        (update) => update.runningSessionId === null
      );

      expect(hasStartEvent).toBe(true);
      expect(hasEndEvent).toBe(true);
    });
  });

  describe('Debug Logging Integration', () => {
    it('should log session lifecycle events in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const sessionId = 'debug-session';

      // Start session
      server.setRunningSession(sessionId);
      expect(consoleSpy).toHaveBeenCalledWith(`[DEBUG] Session started: ${sessionId}`);

      // End session
      server.clearRunningSession(sessionId);
      expect(consoleSpy).toHaveBeenCalledWith(`[DEBUG] Session ended: ${sessionId}`);

      consoleSpy.mockRestore();
    });

    it('should log server status broadcasts in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const sessionId = 'broadcast-debug-session';

      // Create a mock session
      const mockSession = {
        getProcessingStatus: () => false,
        agent: { status: () => 'ready' },
      };
      server.sessions[sessionId] = mockSession as any;

      // Trigger a broadcast
      server.setRunningSession(sessionId);

      // Check for debug log
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Server status broadcast:',
        expect.stringContaining('isExclusive')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Status Integration', () => {
    it('should include session processing status in server status', async () => {
      clientSocket = await connectClient();
      const sessionId = 'status-session';

      // Create sessions with different statuses
      const executingSession = {
        getProcessingStatus: () => true,
        agent: { status: () => 'executing' },
      };
      const idleSession = {
        getProcessingStatus: () => false,
        agent: { status: () => 'ready' },
      };

      server.sessions['executing-session'] = executingSession as any;
      server.sessions['idle-session'] = idleSession as any;

      const statusPromise = new Promise((resolve) => {
        clientSocket.on('server-status', resolve);
      });

      clientSocket.emit('get-server-status');

      const status = await statusPromise;
      expect(status).toMatchObject({
        activeSessions: 2,
        sessionStatuses: {
          'executing-session': {
            isProcessing: true,
            state: 'executing',
          },
          'idle-session': {
            isProcessing: false,
            state: 'ready',
          },
        },
      });
    });
  });
});
