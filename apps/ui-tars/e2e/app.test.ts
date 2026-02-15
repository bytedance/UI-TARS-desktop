/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ElectronApplication, Page, expect, test } from '@playwright/test';
import { launchPackagedElectronApp } from './helpers/electronApp';

const APP_BOOT_TIMEOUT_MS = 30_000;

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const launched = await launchPackagedElectronApp();
  electronApp = launched.electronApp;
  page = launched.page;

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
  await page.waitForLoadState('domcontentloaded', {
    timeout: APP_BOOT_TIMEOUT_MS,
  });
  await page.waitForSelector('button', {
    state: 'visible',
    timeout: APP_BOOT_TIMEOUT_MS,
  });

  const settingsButton = page.getByRole('button', { name: 'Settings' });
  const teachButton = page.getByRole('button', { name: 'Teach' });

  await expect(settingsButton).toBeVisible({ timeout: APP_BOOT_TIMEOUT_MS });
  await expect(teachButton).toBeVisible({ timeout: APP_BOOT_TIMEOUT_MS });
});
