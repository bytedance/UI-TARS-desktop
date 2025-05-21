/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolve } from 'path';
import { AgentSnapshot } from '@multimodal/agent-snapshot';

const snapshotPath = resolve(__dirname, '../fixtures/tool-calls/basic');

async function snapshotToolCallsBasic() {
  const { agent, runOptions } = await import('../examples/tool-calls/basic');
  // @ts-expect-error
  const agentSnapshot = new AgentSnapshot(agent, {
    updateSnapshots: true,
    snapshotPath,
  });

  await agentSnapshot.generate(runOptions);
}

async function testToolCallsBasic() {
  const { agent, runOptions } = await import('../examples/tool-calls/basic');
  // @ts-expect-error
  const agentSnapshot = new AgentSnapshot(agent, {
    snapshotPath,
  });

  const response = await agentSnapshot.run(runOptions);
  console.log(response);
}

async function main() {
  // await snapshotToolCallsBasic();
  await testToolCallsBasic();
}

main();
