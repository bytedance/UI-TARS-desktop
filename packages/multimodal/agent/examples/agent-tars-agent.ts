/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { TARSAgent } from '../src';
import { getModel } from './model';

const model = getModel('qwen3:1.7b');

async function main() {
  const agent = new TARSAgent({
    modelProviders: model,
    instructions:
      'You are Agent TARS, a helpful assistant that can use the tools available to help users with their questions.',
    mcpServers: {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
    },
  });
}
