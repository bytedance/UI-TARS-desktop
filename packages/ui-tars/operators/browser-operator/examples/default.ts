/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger } from '@agent-infra/logger';
import { GUIAgent, StatusEnum } from '@ui-tars/sdk';
import { BrowserOperator, DefaultBrowserOperator } from '../src';

async function main() {
  if (!DefaultBrowserOperator.hasBrowser()) {
    console.error('No available browser found on this system.');
    process.exit(1);
  }

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
  const operator = new BrowserOperator({
    browser,
    browserType: 'chrome',
    logger,
    // Enable highlighting of clickable elements (enabled by default)
    highlightClickableElements: true,
  });

  // 4. Create a GUIAgent instance
  const agent = new GUIAgent({
    model: {
      baseURL: process.env.VLM_BASE_URL,
      apiKey: process.env.VLM_API_KEY,
      model: process.env.VLM_MODEL_NAME as string,
    },
    operator,
  });

  // 5. Run the agent
  // const instruction =
  //   'Tell me what is the latest Pull Request of UI-TARS-Desktop';
  const instruction = `Review the code of latest Pull Request of UI-TARS-Desktop,
    and give me a 500-word summary
    `;
  try {
    await agent.run(instruction);
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    // Run some cleanup tasks
    await browser.close();
  }
}

main().catch(console.error);
