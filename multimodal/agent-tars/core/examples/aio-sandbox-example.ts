/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARS, AgentTARSOptions } from '../src';

export default class MyAIOAgentTARS<
  T extends AgentTARSOptions = AgentTARSOptions,
> extends AgentTARS<T> {
  static label = 'AIOAgentTARS';
}

async function main() {
  const aioAgent = new AgentTARS({
    aioSandbox: 'http://localhost:8080',
    model: {
      provider: 'volcengine',
      id: 'ep-20250510145437-5sxhs',
      apiKey: process.env.ARK_API_KEY,
      displayName: 'doubao-1.5-thinking-vision-pro',
    },
  });

  await aioAgent.initialize();

  const tools = aioAgent.getTools();
  console.log('\n📋 Available Tools:');
  console.log('─'.repeat(80));
  tools.forEach((tool, index) => {
    const num = (index + 1).toString().padStart(2, ' ');
    const name = tool.name.padEnd(30, ' ');
    const desc = (tool.description || 'No description').substring(0, 45).replace(/\n/g, ' ');
    console.log(`${num}. ${name} │ ${desc}`);
  });
  console.log('─'.repeat(80));
  console.log(`Total: ${tools.length} tools\n`);

  const response = await aioAgent.run('Open https://seed-tars.com');
  console.log(response);
}

main();
