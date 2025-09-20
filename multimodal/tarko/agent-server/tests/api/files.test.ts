/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AgentServer } from '../../src/server';
import { MockAgent } from '../mocks/MockAgent';
import { AgentServerInitOptions } from '../../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('File Upload API', () => {
  let server: AgentServer;
  let tempWorkspace: string;

  beforeAll(async () => {
    // Create temporary workspace
    tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'test-workspace-'));

    const config: AgentServerInitOptions = {
      appConfig: {
        agent: MockAgent,
        workspace: tempWorkspace,
        server: {
          port: 0, // Use random port
        },
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
      },
    };

    server = new AgentServer(config);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    // Clean up temp workspace
    if (fs.existsSync(tempWorkspace)) {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    }
  });

  it('should upload image files and return base64', async () => {
    // Create a simple test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await request(server.getApp())
      .post('/v1/file/upload')
      .attach('files', testImageBuffer, 'test.png')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('type', 'image_url');
    expect(response.body[0]).toHaveProperty('image_url');
    expect(response.body[0].image_url).toHaveProperty('url');
    expect(response.body[0].image_url.url).toMatch(/^data:image\/png;base64,/);
  });

  it('should upload non-image files and save to workspace', async () => {
    const testFileContent = 'This is a test file content';
    const testFileBuffer = Buffer.from(testFileContent, 'utf8');

    const response = await request(server.getApp())
      .post('/v1/file/upload')
      .attach('files', testFileBuffer, 'test.txt')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('type', 'text');
    expect(response.body[0]).toHaveProperty('text');
    expect(response.body[0].text).toMatch(/^Current file path: .*test-.*\.txt$/);

    // Verify file was actually saved
    const filePath = response.body[0].text.replace('Current file path: ', '');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe(testFileContent);
  });

  it('should handle multiple files upload', async () => {
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    const testFileBuffer = Buffer.from('Test content', 'utf8');

    const response = await request(server.getApp())
      .post('/v1/file/upload')
      .attach('files', testImageBuffer, 'image.png')
      .attach('files', testFileBuffer, 'document.txt')
      .expect(200);

    expect(response.body).toHaveLength(2);
    
    // First file should be image (base64)
    expect(response.body[0]).toHaveProperty('type', 'image_url');
    expect(response.body[0].image_url.url).toMatch(/^data:image\/png;base64,/);
    
    // Second file should be text file (saved to workspace)
    expect(response.body[1]).toHaveProperty('type', 'text');
    expect(response.body[1].text).toMatch(/^Current file path: .*document-.*\.txt$/);
  });

  it('should return error when no files uploaded', async () => {
    const response = await request(server.getApp())
      .post('/v1/file/upload')
      .expect(400);

    expect(response.body).toHaveProperty('error', 'No files uploaded');
  });
});
