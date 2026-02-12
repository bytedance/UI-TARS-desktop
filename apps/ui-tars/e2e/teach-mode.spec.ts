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

test('teach route is reachable from sidebar', async () => {
  await page.waitForLoadState('domcontentloaded', { timeout: 0 });
  await page.getByRole('button', { name: 'Teach' }).click();

  await expect(page.getByText('Teach Mode')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start training session' }),
  ).toBeVisible();
  await expect(page.getByText('Skill library')).toBeVisible();
});
