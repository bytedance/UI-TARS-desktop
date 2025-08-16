/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentServer } from '../server';
import { AgentAppConfig, LogLevel } from '@tarko/interface';
import { MockAgent } from './mocks/MockAgent';
import { MockAgioProvider } from './mocks/MockAgioProvider';
import express from 'express';
import http from 'http';

// Simple HTTP request helper for testing
const makeRequest = async (app: express.Application, method: string, path: string, body?: any) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any)?.port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          server.close();
          try {
            const result = {
              status: res.statusCode,
              body: data ? JSON.parse(data) : {},
            };
            resolve(result);
          } catch (e) {
            resolve({
              status: res.statusCode,
              body: { error: 'Invalid JSON response' },
            });
          }
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
};

describe('Exclusive Mode', () => {
  let server: AgentServer;
  let app: any;

  const createTestConfig = (exclusive: boolean): AgentAppConfig => ({
    agent: 'mock-agent',
    workspace: '/tmp/test-workspace',
    logLevel: LogLevel.INFO,
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
    // Mock the agent resolver to return our mock agent
    vi.doMock('../utils/agent-resolver', () => ({
      resolveAgentImplementation: vi.fn().mockResolvedValue({
        agentConstructor: MockAgent,
        agentName: 'mock-agent',
        agioProviderConstructor: MockAgioProvider,
      }),
    }));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    vi.clearAllMocks();
  });

  describe('Non-exclusive mode', () => {
    beforeEach(async () => {
      server = new AgentServer({
        appConfig: createTestConfig(false),
        directories: { globalWorkspaceDir: '/tmp' },
      });
      app = server.getApp();
      await server.start();
    });

    it('should allow multiple concurrent session creations', async () => {
      const promises = [
        makeRequest(app, 'POST', '/api/v1/sessions/create', {}),
        makeRequest(app, 'POST', '/api/v1/sessions/create', {}),
        makeRequest(app, 'POST', '/api/v1/sessions/create', {}),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response: any) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('sessionId');
      });
    });

    it('should allow multiple concurrent oneshot queries', async () => {
      const promises = [
        makeRequest(app, 'POST', '/api/v1/oneshot/query', { query: 'Test query 1' }),
        makeRequest(app, 'POST', '/api/v1/oneshot/query', { query: 'Test query 2' }),
        makeRequest(app, 'POST', '/api/v1/oneshot/query', { query: 'Test query 3' }),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('result');
      });
    });
  });

  describe('Exclusive mode', () => {
    beforeEach(async () => {
      server = new AgentServer({
        appConfig: createTestConfig(true),
        directories: { globalWorkspaceDir: '/tmp' },
      });
      app = server.getApp();
      await server.start();
    });

    it('should have exclusive mode enabled', () => {
      expect(server.isExclusive).toBe(true);
    });

    it('should initially allow new requests', () => {
      expect(server.canAcceptNewRequest()).toBe(true);
      expect(server.getRunningSessionId()).toBeNull();
    });

    it('should reject new session creation when another session is running', async () => {
      // Create first session
      const firstResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      expect(firstResponse.status).toBe(201);
      const sessionId = firstResponse.body.sessionId;

      // Simulate session running
      server.setRunningSession(sessionId);

      // Try to create second session
      const secondResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error).toContain('exclusive mode');
      expect(secondResponse.body.runningSessionId).toBe(sessionId);
    });

    it('should reject new oneshot queries when another session is running', async () => {
      // Start a session
      const sessionResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      const sessionId = sessionResponse.body.sessionId;
      server.setRunningSession(sessionId);

      // Try oneshot query
      const response = await makeRequest(app, 'POST', '/api/v1/oneshot/query', { query: 'Test query' }) as any;

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('exclusive mode');
      expect(response.body.runningSessionId).toBe(sessionId);
    });

    it('should reject streaming oneshot queries when another session is running', async () => {
      // Start a session
      const sessionResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      const sessionId = sessionResponse.body.sessionId;
      server.setRunningSession(sessionId);

      // Try streaming oneshot query
      const response = await makeRequest(app, 'POST', '/api/v1/oneshot/query/stream', { query: 'Test query' }) as any;

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('exclusive mode');
      expect(response.body.runningSessionId).toBe(sessionId);
    });

    it('should allow new requests after session is cleared', async () => {
      // Create and start a session
      const firstResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      const sessionId = firstResponse.body.sessionId;
      server.setRunningSession(sessionId);

      expect(server.canAcceptNewRequest()).toBe(false);

      // Clear the session
      server.clearRunningSession(sessionId);

      expect(server.canAcceptNewRequest()).toBe(true);
      expect(server.getRunningSessionId()).toBeNull();

      // Should now allow new session
      const secondResponse = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;
      expect(secondResponse.status).toBe(201);
    });

    it('should only clear session if it matches the running session', async () => {
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      server.setRunningSession(sessionId1);
      expect(server.getRunningSessionId()).toBe(sessionId1);

      // Try to clear different session
      server.clearRunningSession(sessionId2);
      expect(server.getRunningSessionId()).toBe(sessionId1);

      // Clear correct session
      server.clearRunningSession(sessionId1);
      expect(server.getRunningSessionId()).toBeNull();
    });
  });

  describe('Middleware integration', () => {
    beforeEach(async () => {
      server = new AgentServer({
        appConfig: createTestConfig(true),
        directories: { globalWorkspaceDir: '/tmp' },
      });
      app = server.getApp();
      await server.start();
    });

    it('should apply exclusive mode middleware to session creation endpoint', async () => {
      server.setRunningSession('test-session');

      const response = await makeRequest(app, 'POST', '/api/v1/sessions/create', {}) as any;

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('exclusive mode');
    });

    it('should apply exclusive mode middleware to oneshot endpoints', async () => {
      server.setRunningSession('test-session');

      const responses = await Promise.all([
        makeRequest(app, 'POST', '/api/v1/oneshot/query', { query: 'test' }),
        makeRequest(app, 'POST', '/api/v1/oneshot/query/stream', { query: 'test' }),
      ]);

      responses.forEach((response: any) => {
        expect(response.status).toBe(409);
        expect(response.body.error).toContain('exclusive mode');
      });
    });

    it('should not affect other endpoints', async () => {
      server.setRunningSession('test-session');

      // These endpoints should still work
      const response = await makeRequest(app, 'GET', '/api/v1/sessions/', null) as any;
      expect(response.status).toBe(200);
    });
  });
});
