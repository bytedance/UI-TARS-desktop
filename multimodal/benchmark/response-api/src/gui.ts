/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple test script to verify the benchmark system works
 */

import { GUIStrategy } from './strategies';

async function test() {
  console.log('🧪 Testing GUI Benchmark System...\n');

  try {
    const gui = new GUIStrategy();

    const agent = await gui.createAgent({
      useResponseApi: true,
      modelId: 'ep-20250613182556-7z8pl', // 1.6
      // modelId: 'ep-20250510145437-5sxhs', // 1.5-vl
      // modelId: 'ep-20250613174618-nld9c', // 1.6-flash
      // thinking: 'enabled',
      dumpMessageHistory: true,
    });

    const res = await gui.executeTask(agent);

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
