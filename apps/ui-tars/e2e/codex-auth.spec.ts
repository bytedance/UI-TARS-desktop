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

test('settings exposes OpenAI Codex OAuth provider', async () => {
  await page.waitForLoadState('domcontentloaded', {
    timeout: APP_BOOT_TIMEOUT_MS,
  });
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(
    page.getByRole('heading', { name: 'VLM Settings' }),
  ).toBeVisible();

  const providerCombobox = page.locator('button[role="combobox"]').first();
  await providerCombobox.click();

  await expect(
    page.getByRole('option', { name: 'OpenAI Codex OAuth' }).first(),
  ).toBeVisible();
});
