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
});

test.afterAll(async () => {
  await electronApp?.close();
});

test('teach route is reachable from sidebar', async () => {
  await page.waitForLoadState('domcontentloaded', {
    timeout: APP_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('button', { name: 'Teach' })).toBeVisible({
    timeout: APP_BOOT_TIMEOUT_MS,
  });
  await page.getByRole('button', { name: 'Teach' }).click();

  await expect(page.getByText('Teach Mode')).toBeVisible({
    timeout: APP_BOOT_TIMEOUT_MS,
  });
  await expect(
    page.getByRole('button', { name: 'Start training session' }),
  ).toBeVisible({ timeout: APP_BOOT_TIMEOUT_MS });
  await expect(page.getByText('Skill library')).toBeVisible({
    timeout: APP_BOOT_TIMEOUT_MS,
  });
});
