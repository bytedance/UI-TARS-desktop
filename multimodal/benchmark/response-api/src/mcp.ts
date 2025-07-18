/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple test script to verify the benchmark system works
 */

import { MCPStrategy } from './strategies';

async function test() {
  console.log('🧪 Testing MCP Benchmark System...\n');

  try {
    const mcp = new MCPStrategy();

    const agent = await mcp.createAgent({ useResponseApi: false });

    const res = await mcp.executeTask(agent);

    console.log('res: ', res);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n Please check:');
    console.log('1. Environment variables (ARK_API_KEY)');
    console.log('2. Network connectivity');
    console.log('3. Dependencies installation');
    process.exit(1);
  }
}

if (require.main === module) {
  test().catch(console.error);
}
