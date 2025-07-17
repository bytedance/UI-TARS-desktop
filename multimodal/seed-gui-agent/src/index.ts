/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { seedGUIAgent } from './SeedGUIAgent';

async function main() {
  const response = await seedGUIAgent.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent Response:');
  console.log('================================================');
  console.log(response.content);
  console.log('================================================');
}

if (require.main === module) {
  main().catch(console.error);
}
