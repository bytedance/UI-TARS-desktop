/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.unmock('express');
vi.unmock('http');
vi.unmock('cors');

import express from 'express';
import request from 'supertest';

import { setupAPI } from '../../src/api';

const PORT = 8888;

function createApp() {
  const app = express();
  setupAPI(app, { port: PORT, host: '127.0.0.1' });
  return app;
}

describe('CORS origin check', () => {
  const ORIGINAL_ORIGINS = process.env.TARKO_ALLOWED_ORIGINS;

  afterEach(() => {
    if (ORIGINAL_ORIGINS === undefined) {
      delete process.env.TARKO_ALLOWED_ORIGINS;
    } else {
      process.env.TARKO_ALLOWED_ORIGINS = ORIGINAL_ORIGINS;
    }
  });

  it('answers a disallowed origin with 403 and the setting to change', async () => {
    delete process.env.TARKO_ALLOWED_ORIGINS;

    const res = await request(createApp())
      .get('/api/v1/health')
      .set('Host', `localhost:${PORT}`)
      .set('Origin', 'https://agent.example.com');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Origin not allowed');
    expect(res.body.message).toContain('TARKO_ALLOWED_ORIGINS');
  });

  it('serves an origin allowed through TARKO_ALLOWED_ORIGINS', async () => {
    process.env.TARKO_ALLOWED_ORIGINS = 'https://agent.example.com';

    const res = await request(createApp())
      .get('/api/v1/health')
      .set('Host', `localhost:${PORT}`)
      .set('Origin', 'https://agent.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://agent.example.com');
  });
});
