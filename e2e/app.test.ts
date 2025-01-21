/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ElectronApplication,
  _electron as electron,
  expect,
  test,
} from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';

let electronApp: ElectronApplication;
test.afterAll(async () => {
  await electronApp?.close();
});

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const { executable: executablePath, main } = parseElectronApp(latestBuild);
  console.log('executablePath:', executablePath, '\nmain:', main);
  process.env.CI = 'e2e';
  electronApp = await electron.launch({
    args: [main],
    executablePath,
  });
  console.log('electronApp after', electronApp);
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

test('app can launch', async () => {
  console.log('electronApp', electronApp);

  // Wait for the first BrowserWindow to open
  // and return its Page object
  const page = await electronApp.firstWindow();

  await page.waitForLoadState('domcontentloaded');

  const buttonElement = await page.$('button');
  expect(await buttonElement?.isVisible()).toBe(true);
});
