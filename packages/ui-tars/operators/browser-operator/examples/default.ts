/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger } from '@agent-infra/logger';
import { GUIAgent, StatusEnum } from '@ui-tars/sdk';
import { BrowserOperator } from '../src';

async function main() {
  // 1. Create a local browser
  const logger = new ConsoleLogger('[BrowserGUIAgent]');
  const browser = new LocalBrowser({
    logger,
  });
  await browser.launch();

  // 2. Navigate to a page
  const openingPage = await browser.createPage();
  await openingPage.goto('https://www.google.com/', {
    waitUntil: 'networkidle2',
  });

  // 3. Create a BrowserOperator instance
  let finalAnswer = '';

  const operator = new BrowserOperator({
    browser,
    logger,
    // Enable highlighting of clickable elements (enabled by default)
    highlightClickableElements: true,
    onFinalAnswer: async (value) => {
      finalAnswer = value;
    },
  });

  // 4. Create a GUIAgent instance
  const agent = new GUIAgent({
    model: {
      baseURL: process.env.VLM_BASE_URL,
      apiKey: process.env.VLM_API_KEY,
      model: process.env.VLM_MODEL_NAME as string,
    },
    operator,
    onData: ({ data }) => {
      if (
        data.status === StatusEnum.END &&
        data.conversations.length > 0 &&
        !finalAnswer
      ) {
        finalAnswer = data.conversations[0].value;
      }
      logger.log(data);
    },
    onError: ({ data, error }) => {
      logger.error(error, data);
    },
  });

  // 5. Run the agent
  const instruction =
    'Tell me what is the latest Pull Request of UI-TARS-Desktop';
  try {
    await agent.run(instruction);
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    // Run some cleanup tasks
    await browser.close();
  }

  require('node-notifier').notify({
    title: instruction,
    message: finalAnswer,
  });

  console.log('\n');
  console.log('\x1b[38;2;0;255;127m╭──────────────────────────────╮');
  console.log('│       🤖 Final Answer        │');
  console.log('╰──────────────────────────────╯\x1b[0m');
  console.log('\x1b[38;2;64;224;208m%s\x1b[0m', finalAnswer);
  console.log('\n');
}

main().catch(console.error);
