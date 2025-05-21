/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolve } from 'path';
import { AgentSnapshot } from '@multimodal/agent-snapshot';

const snapshotPath = resolve(__dirname, '../fixtures/default');
// const input = 'UI-TARS-desktop 的 star 是多少？';
const input = `Please assist me in searching for, analyzing, and summarizing NVIIDIA's stock price over the past year. Ultimately, I need a visual representation of the stock pricee trend and a corresponding rese arch report. You can use tools such as Python3 for plotting thedata. The final report should be presented in a web page format.`;

async function createSnapshot() {
  const { agent } = await import('../examples/default');
  const agentSnapshot = new AgentSnapshot(agent, {
    updateSnapshots: true,
    snapshotPath,
  });

  await agentSnapshot.generate({
    input,
    stream: true,
  });
}

async function testSnapshot() {
  const { agent } = await import('../examples/default');
  const agentSnapshot = new AgentSnapshot(agent, {
    snapshotPath,
  });

  const response = await agentSnapshot.run({
    input,
    stream: true,
  });
  console.log(response);
}

async function main() {
  if (process.env.TEST) {
    await testSnapshot();
  } else {
    await createSnapshot();
  }
}

main();
