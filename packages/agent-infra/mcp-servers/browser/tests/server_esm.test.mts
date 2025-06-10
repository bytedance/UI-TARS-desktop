import { describe, test, expect } from 'vitest';
import { createServer as createServerEsm } from '../dist/server.js';
const { createServer: createServerCjs } = require('../dist/server.cjs');

describe('Browser MCP Server modules esm', () => {
  test('should create server from esm', async () => {
    const server = createServerEsm();
    expect(server).toBeDefined();
  });
  test('should create server from cjs', async () => {
    const server = createServerCjs();
    expect(server).toBeDefined();
  });
});
