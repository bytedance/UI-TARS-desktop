/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentServer } from '../server';
import { AgentAppConfig, LogLevel } from '@tarko/interface';

describe('AgentServer Basic Functionality', () => {
  let server: AgentServer;

  const createTestConfig = (exclusive: boolean = false): AgentAppConfig => ({
    agent: 'mock-agent',
    workspace: '/tmp/test-workspace',
    logLevel: LogLevel.INFO,
    server: {
      port: 0,
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

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Server Configuration', () => {
    it('should initialize with non-exclusive mode by default', () => {
      server = new AgentServer({
        appConfig: createTestConfig(false),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(server.isExclusive).toBe(false);
      expect(server.canAcceptNewRequest()).toBe(true);
      expect(server.getRunningSessionId()).toBeNull();
    });

    it('should initialize with exclusive mode when configured', () => {
      server = new AgentServer({
        appConfig: createTestConfig(true),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(server.isExclusive).toBe(true);
      expect(server.canAcceptNewRequest()).toBe(true);
      expect(server.getRunningSessionId()).toBeNull();
    });

    it('should have debug mode disabled by default', () => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(server.isDebug).toBe(false);
    });

    it('should enable debug mode when logLevel is DEBUG', () => {
      const config = createTestConfig();
      config.logLevel = LogLevel.DEBUG;
      
      server = new AgentServer({
        appConfig: config,
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(server.isDebug).toBe(true);
    });
  });

  describe('Exclusive Mode State Management', () => {
    beforeEach(() => {
      server = new AgentServer({
        appConfig: createTestConfig(true),
        directories: { globalWorkspaceDir: '/tmp' },
      });
    });

    it('should manage running session state correctly', () => {
      const sessionId = 'test-session-123';

      // Initially no running session
      expect(server.getRunningSessionId()).toBeNull();
      expect(server.canAcceptNewRequest()).toBe(true);

      // Set running session
      server.setRunningSession(sessionId);
      expect(server.getRunningSessionId()).toBe(sessionId);
      expect(server.canAcceptNewRequest()).toBe(false);

      // Clear running session
      server.clearRunningSession(sessionId);
      expect(server.getRunningSessionId()).toBeNull();
      expect(server.canAcceptNewRequest()).toBe(true);
    });

    it('should only clear session if it matches the running session', () => {
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      server.setRunningSession(sessionId1);
      expect(server.getRunningSessionId()).toBe(sessionId1);

      // Try to clear different session - should not work
      server.clearRunningSession(sessionId2);
      expect(server.getRunningSessionId()).toBe(sessionId1);

      // Clear correct session - should work
      server.clearRunningSession(sessionId1);
      expect(server.getRunningSessionId()).toBeNull();
    });

    it('should not affect session state in non-exclusive mode', () => {
      server = new AgentServer({
        appConfig: createTestConfig(false),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      const sessionId = 'test-session';

      // Should always accept requests in non-exclusive mode
      expect(server.canAcceptNewRequest()).toBe(true);
      
      server.setRunningSession(sessionId);
      expect(server.canAcceptNewRequest()).toBe(true);
      expect(server.getRunningSessionId()).toBeNull(); // Should remain null

      server.clearRunningSession(sessionId);
      expect(server.canAcceptNewRequest()).toBe(true);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server correctly', async () => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(server.isServerRunning()).toBe(false);

      const httpServer = await server.start();
      expect(server.isServerRunning()).toBe(true);
      expect(httpServer).toBeDefined();

      await server.stop();
      expect(server.isServerRunning()).toBe(false);
    });

    it('should provide Express app and HTTP server instances', async () => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      const app = server.getApp();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');

      const httpServer = server.getHttpServer();
      expect(httpServer).toBeDefined();

      const socketServer = server.getSocketIOServer();
      expect(socketServer).toBeDefined();
    });
  });

  describe('Model Configuration', () => {
    beforeEach(() => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });
    });

    it('should return available models', () => {
      const models = server.getAvailableModels();
      expect(models).toEqual([
        {
          name: 'openai',
          models: ['gpt-4', 'gpt-3.5-turbo'],
        },
      ]);
    });

    it('should validate model configurations', () => {
      expect(server.isModelConfigValid('openai', 'gpt-4')).toBe(true);
      expect(server.isModelConfigValid('openai', 'gpt-3.5-turbo')).toBe(true);
      expect(server.isModelConfigValid('openai', 'invalid-model')).toBe(false);
      expect(server.isModelConfigValid('invalid-provider', 'gpt-4')).toBe(false);
    });

    it('should return default model configuration', () => {
      const defaultConfig = server.getDefaultModelConfig();
      expect(defaultConfig).toEqual({
        provider: 'openai',
        modelId: 'gpt-4',
      });
    });
  });

  describe('Storage Information', () => {
    it('should return storage info when no storage is configured', () => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });

      const storageInfo = server.getStorageInfo();
      expect(storageInfo).toEqual({ type: 'none' });
    });
  });

  describe('Workspace Management', () => {
    beforeEach(() => {
      server = new AgentServer({
        appConfig: createTestConfig(),
        directories: { globalWorkspaceDir: '/tmp' },
      });
    });

    it('should return current workspace path', () => {
      const workspace = server.getCurrentWorkspace();
      expect(workspace).toBe('/tmp/test-workspace');
    });

    it('should throw error if workspace is not specified', () => {
      const config = createTestConfig();
      delete config.workspace;
      
      server = new AgentServer({
        appConfig: config,
        directories: { globalWorkspaceDir: '/tmp' },
      });

      expect(() => server.getCurrentWorkspace()).toThrow('Workspace not specified');
    });
  });
});
