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
  const response = aioAgent.run('What is UI-TARS-2?');
  console.log(response);
}

main();
