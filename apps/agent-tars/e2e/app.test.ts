/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ElectronApplication,
  Page,
  _electron as electron,
  expect,
  test,
} from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const { executable: executablePath, main } = parseElectronApp(latestBuild);
  console.log('executablePath:', executablePath, '\nmain:', main);
  process.env.CI = 'e2e';
  electronApp = await electron.launch({
    args: [main],
    executablePath,
    env: {
      ...process.env,
      CI: 'e2e',
    },
  });

  page = await electronApp.firstWindow();
  electronApp.on('window', async (page) => {
    const filename = page.url()?.split('/').pop();
    console.log(`Window opened: ${filename}`);

    // capture errors
    page.on('pageerror', (error) => {
      console.error(error);
    });
    // capture console messages
    page.on('console', (msg) => {
      console.log(msg.text());
    });
  });
});

test.afterAll(async () => {
  await electronApp?.close();
});

test('app can launch', async () => {
  test.setTimeout(60_000);
  await page.waitForLoadState('domcontentloaded', { timeout: 0 });

  await page.waitForSelector('button', { state: 'visible' });

  const buttonElement = await page.$('button');
  expect(await buttonElement?.isVisible()).toBe(true);
});
