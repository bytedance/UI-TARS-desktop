import { describe, test, expect } from 'vitest';
const { createServer: createServerCjs } = require('../dist/server.cjs');

describe('Browser MCP Server modules cjs', () => {
  test('should create server from cjs', async () => {
    const server = createServerCjs();
    expect(server).toBeDefined();
  });
});
