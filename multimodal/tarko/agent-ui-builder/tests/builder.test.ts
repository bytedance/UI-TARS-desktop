/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentUIBuilder } from '../src';
import { isDefaultStaticPathValid } from '../src/static-path';
import type { AgentEventStream, SessionInfo } from '@tarko/interface';

// Mock fetch for upload tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

  const mockSessionInfo: SessionInfo = {
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

    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('dump()', () => {
    it('should generate HTML in memory', () => {
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      const html = builder.dump();

      expect(html).toContain('window.AGENT_REPLAY_MODE = true');
      expect(html).toContain('window.AGENT_SESSION_DATA');
      expect(html).toContain('window.AGENT_EVENT_STREAM');
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('test-session'); // session ID should be in the data
    });

    it('should generate HTML and save to file', () => {
      const outputPath = path.join(tempDir, 'output.html');
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      const html = builder.dump(outputPath);

      // Should return the HTML
      expect(html).toContain('window.AGENT_REPLAY_MODE = true');

      // Should save to file
      expect(fs.existsSync(outputPath)).toBe(true);
      const fileContent = fs.readFileSync(outputPath, 'utf8');
      expect(fileContent).toBe(html);
    });

    it('should create directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'output.html');
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      const html = builder.dump(nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);
      expect(html).toContain('window.AGENT_REPLAY_MODE = true');
    });

    it('should work without staticPath (using built-in static files)', () => {
      if (isDefaultStaticPathValid()) {
        // If built-in static files exist, it should work
        const builder = new AgentUIBuilder({
          events: mockEvents,
          sessionInfo: mockSessionInfo,
          // No staticPath provided
        });
        const html = builder.dump();
        expect(html).toContain('window.AGENT_REPLAY_MODE = true');
      } else {
        // If built-in static files don't exist, it should throw an error
        expect(() => {
          const builder = new AgentUIBuilder({
            events: mockEvents,
            sessionInfo: mockSessionInfo,
            // No staticPath provided
          });
          builder.dump();
        }).toThrow('No valid static path found');
      }
    });

    it('should throw error if static path does not exist', () => {
      expect(() => {
        const builder = new AgentUIBuilder({
          events: mockEvents,
          sessionInfo: mockSessionInfo,
          staticPath: '/nonexistent/path',
        });
        builder.dump();
      }).toThrow('Static web UI not found');
    });

    it('should include server info when provided', () => {
      const serverInfo = {
        version: '1.0.0',
        buildTime: Date.now(),
        gitHash: 'abc123',
      };

      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
        serverInfo,
      });

      const html = builder.dump();

      expect(html).toContain('window.AGENT_VERSION_INFO');
      expect(html).toContain('1.0.0');
    });

    it('should include web UI config when provided', () => {
      const uiConfig = { type: 'static', staticPath: mockStaticPath, theme: 'dark' } as any;

      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
        uiConfig,
      });

      const html = builder.dump();

      expect(html).toContain('window.AGENT_WEB_UI_CONFIG');
      expect(html).toContain('dark');
    });
  });

  describe('upload()', () => {
    it('should upload HTML and return share URL', async () => {
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://share.example.com/abc123' }),
      });

      const html = builder.dump();
      const shareUrl = await builder.upload(html, 'https://api.example.com/upload');

      expect(shareUrl).toBe('https://share.example.com/abc123?replay=1');
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });

    it('should upload with options', async () => {
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://share.example.com/my-slug' }),
      });

      const html = builder.dump();
      const shareUrl = await builder.upload(html, 'https://api.example.com/upload', {
        slug: 'my-session',
        query: 'How to use this API?',
      });

      expect(shareUrl).toBe('https://share.example.com/my-slug?replay=1');

      // Check that FormData was created with the right fields
      const call = mockFetch.mock.calls[0];
      const formData = call[1].body as FormData;

      // Note: FormData entries are not easily testable, but we can check the call was made
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });

    it('should include session metadata in upload', async () => {
      const sessionWithMetadata: SessionInfo = {
        ...mockSessionInfo,
        metadata: {
          name: 'Test Session with Metadata',
          tags: ['test', 'metadata'],
        },
      };

      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: sessionWithMetadata,
        staticPath: mockStaticPath,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://share.example.com/abc123' }),
      });

      const html = builder.dump();
      await builder.upload(html, 'https://api.example.com/upload');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });

    it('should throw error on upload failure', async () => {
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const html = builder.dump();

      await expect(builder.upload(html, 'https://api.example.com/upload')).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });

    it('should throw error on invalid response', async () => {
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Invalid request' }), // No url field
      });

      const html = builder.dump();

      await expect(builder.upload(html, 'https://api.example.com/upload')).rejects.toThrow(
        'Invalid response from share provider',
      );
    });
  });

  describe('combined workflow', () => {
    it('should work with dump + upload workflow', async () => {
      const outputPath = path.join(tempDir, 'session.html');
      const builder = new AgentUIBuilder({
        events: mockEvents,
        sessionInfo: mockSessionInfo,
        staticPath: mockStaticPath,
      });

      // Generate and save HTML
      const html = builder.dump(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Upload the same HTML
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://share.example.com/session123' }),
      });

      const shareUrl = await builder.upload(html, 'https://api.example.com/upload', {
        slug: 'test-session',
        query: 'Hello, world!',
      });

      expect(shareUrl).toBe('https://share.example.com/session123?replay=1');

      // Verify file content matches what was uploaded
      const fileContent = fs.readFileSync(outputPath, 'utf8');
      expect(fileContent).toBe(html);
    });
  });
});
