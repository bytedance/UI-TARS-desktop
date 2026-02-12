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
});

test.afterAll(async () => {
  await electronApp?.close();
});

test('settings exposes OpenAI Codex OAuth provider', async () => {
  await page.waitForLoadState('domcontentloaded', { timeout: 0 });
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
