/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('express');
vi.unmock('fs');
vi.unmock('http');

import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import {
  MAX_UPLOAD_FILE_SIZE,
  createStoredFileName,
  sanitizeFileName,
  uploadFiles,
  uploadFilesMiddleware,
} from '../../src/api/controllers/files';
import { csrfProtectionMiddleware } from '../../src/api/middleware/csrf-protection';
import { registerCsrfRoutes } from '../../src/api/routes/csrf';
import { registerFileRoutes } from '../../src/api/routes/files';

describe('file upload API', () => {
  let workspacePath: string;
  let app: express.Application;

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'tarko-file-upload-'));
    app = express();
    app.locals.server = { getCurrentWorkspace: () => workspacePath };
    app.post('/api/v1/files/upload', uploadFilesMiddleware, uploadFiles);
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('persists a data file and returns a safe workspace-relative path', async () => {
    const content = 'date,value\n2025-01-01,42\n';
    const response = await request(app)
      .post('/api/v1/files/upload')
      .attach('files', Buffer.from(content), 'quarterly report?.csv')
      .expect(200);

    expect(response.body.files).toHaveLength(1);
    expect(response.body.files[0]).toMatchObject({
      name: 'quarterly report?.csv',
      size: Buffer.byteLength(content),
      mimeType: 'text/csv',
    });
    expect(response.body.files[0].relativePath).toMatch(
      /^uploads\/quarterly-report-[A-Za-z0-9_-]{10}\.csv$/,
    );

    const storedPath = path.join(workspacePath, response.body.files[0].relativePath);
    expect(fs.readFileSync(storedPath, 'utf8')).toBe(content);
  });

  it('supports multiple files in one request', async () => {
    const response = await request(app)
      .post('/api/v1/files/upload')
      .attach('files', Buffer.from('{"ok":true}'), 'data.json')
      .attach('files', Buffer.from('a,b\n1,2\n'), 'data.csv')
      .expect(200);

    expect(response.body.files).toHaveLength(2);
    expect(response.body.files.map((file: { relativePath: string }) => file.relativePath)).toEqual([
      expect.stringMatching(/^uploads\/data-[A-Za-z0-9_-]{10}\.json$/),
      expect.stringMatching(/^uploads\/data-[A-Za-z0-9_-]{10}\.csv$/),
    ]);
  });

  it('rejects an empty upload', async () => {
    const response = await request(app).post('/api/v1/files/upload').expect(400);
    expect(response.body).toEqual({ error: 'No files uploaded' });
  });

  it('uses the production CSRF contract for multipart uploads', async () => {
    const securedApp = express();
    securedApp.locals.server = { getCurrentWorkspace: () => workspacePath };
    securedApp.use(express.json());
    registerCsrfRoutes(securedApp);
    securedApp.use(csrfProtectionMiddleware);
    registerFileRoutes(securedApp);

    await request(securedApp)
      .post('/api/v1/files/upload')
      .attach('files', Buffer.from('blocked'), 'blocked.csv')
      .expect(403);

    const tokenResponse = await request(securedApp).get('/api/v1/csrf-token').expect(200);
    const response = await request(securedApp)
      .post('/api/v1/files/upload')
      .set('X-CSRF-Token', tokenResponse.body.token)
      .attach('files', Buffer.from('allowed'), 'allowed.csv')
      .expect(200);

    expect(response.body.files[0].relativePath).toMatch(
      /^uploads\/allowed-[A-Za-z0-9_-]{10}\.csv$/,
    );
  });

  it('rejects files above the per-file size limit', async () => {
    const response = await request(app)
      .post('/api/v1/files/upload')
      .attach('files', Buffer.alloc(MAX_UPLOAD_FILE_SIZE + 1), 'oversized.csv')
      .expect(413);

    expect(response.body).toMatchObject({ code: 'LIMIT_FILE_SIZE' });
  });

  it('sanitizes names and adds a collision-resistant suffix', () => {
    expect(sanitizeFileName('../../unsafe data?.csv')).toBe('unsafe-data-.csv');
    expect(createStoredFileName('../../unsafe data?.csv')).toMatch(
      /^unsafe-data-[A-Za-z0-9_-]{10}\.csv$/,
    );
  });
});
