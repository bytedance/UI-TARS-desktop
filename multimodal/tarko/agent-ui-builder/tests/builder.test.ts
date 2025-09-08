/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentUIBuilder, buildHTMLInMemory, buildHTMLToFile } from '../src';
import type { AgentEventStream, SessionItemInfo } from '@tarko/interface';

describe('AgentUIBuilder', () => {
  const mockEvents: AgentEventStream.Event[] = [
    {
      id: 'test-1',
      type: 'user_message',
      timestamp: Date.now(),
      content: 'Hello, world!',
    },
    {
      id: 'test-2',
      type: 'assistant_message',
      timestamp: Date.now(),
      content: 'Hello! How can I help you?',
    },
  ];

  const mockMetadata: SessionItemInfo = {
    id: 'test-session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspace: '/test/workspace',
    metadata: {
      name: 'Test Session',
      tags: ['test'],
    },
  };

  let tempDir: string;
  let mockStaticPath: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-builder-test-'));
    mockStaticPath = path.join(tempDir, 'static');
    fs.mkdirSync(mockStaticPath, { recursive: true });

    // Create mock index.html
    const mockHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Agent UI</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

    fs.writeFileSync(path.join(mockStaticPath, 'index.html'), mockHTML);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generateHTML', () => {
    it('should generate HTML with injected data', () => {
      const html = AgentUIBuilder.generateHTML({
        events: mockEvents,
        metadata: mockMetadata,
        staticPath: mockStaticPath,
      });

      expect(html).toContain('window.AGENT_REPLAY_MODE = true');
      expect(html).toContain('window.AGENT_SESSION_DATA');
      expect(html).toContain('window.AGENT_EVENT_STREAM');
      expect(html).toContain('<div id="root"></div>');
    });

    it('should throw error if static path does not exist', () => {
      expect(() => {
        AgentUIBuilder.generateHTML({
          events: mockEvents,
          metadata: mockMetadata,
          staticPath: '/nonexistent/path',
        });
      }).toThrow('Static web UI not found');
    });

    it('should include server info when provided', () => {
      const serverInfo = {
        version: '1.0.0',
        buildTime: Date.now(),
        gitHash: 'abc123',
      };

      const html = AgentUIBuilder.generateHTML({
        events: mockEvents,
        metadata: mockMetadata,
        staticPath: mockStaticPath,
        serverInfo,
      });

      expect(html).toContain('window.AGENT_VERSION_INFO');
      expect(html).toContain('1.0.0');
    });

    it('should include web UI config when provided', () => {
      const webUIConfig = { theme: 'dark', debug: true };

      const html = AgentUIBuilder.generateHTML({
        events: mockEvents,
        metadata: mockMetadata,
        staticPath: mockStaticPath,
        webUIConfig,
      });

      expect(html).toContain('window.AGENT_WEB_UI_CONFIG');
      expect(html).toContain('dark');
    });
  });

  describe('buildHTMLInMemory', () => {
    it('should build HTML in memory', async () => {
      const result = await buildHTMLInMemory({
        events: mockEvents,
        metadata: mockMetadata,
        staticPath: mockStaticPath,
      });

      expect(result.html).toContain('window.AGENT_REPLAY_MODE = true');
      expect(result.metadata.eventCount).toBe(2);
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.filePath).toBeUndefined();
      expect(result.customResult).toBeUndefined();
    });
  });

  describe('buildHTMLToFile', () => {
    it('should write HTML to file', async () => {
      const outputPath = path.join(tempDir, 'output.html');

      const result = await buildHTMLToFile(
        {
          events: mockEvents,
          metadata: mockMetadata,
          staticPath: mockStaticPath,
        },
        outputPath,
      );

      expect(result.filePath).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      const fileContent = fs.readFileSync(outputPath, 'utf8');
      expect(fileContent).toContain('window.AGENT_REPLAY_MODE = true');
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'output.html');

      await buildHTMLToFile(
        {
          events: mockEvents,
          metadata: mockMetadata,
          staticPath: mockStaticPath,
        },
        nestedPath,
      );

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should throw error if file exists and overwrite is false', async () => {
      const outputPath = path.join(tempDir, 'existing.html');
      fs.writeFileSync(outputPath, 'existing content');

      await expect(
        buildHTMLToFile(
          {
            events: mockEvents,
            metadata: mockMetadata,
            staticPath: mockStaticPath,
          },
          outputPath,
          false,
        ),
      ).rejects.toThrow('File already exists');
    });
  });
});
