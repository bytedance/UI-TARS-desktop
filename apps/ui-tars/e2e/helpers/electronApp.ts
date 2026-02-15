/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ElectronApplication,
  Page,
  _electron as electron,
} from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';

const APP_ROOT = process.cwd();
const DIST_MAIN = join(APP_ROOT, 'dist', 'main', 'main.js');
const OUT_DIR = join(APP_ROOT, 'out');

const ensureBuildArtifacts = (): void => {
  if (!existsSync(DIST_MAIN)) {
    throw new Error(
      `[E2E_ARTIFACT_MISSING] Missing build artifact: ${DIST_MAIN}. Run \"pnpm run build:e2e\" before e2e tests.`,
    );
  }

  if (!existsSync(OUT_DIR)) {
    throw new Error(
      `[E2E_ARTIFACT_MISSING] Missing packaged output directory: ${OUT_DIR}. Run \"pnpm run build:e2e\" before e2e tests.`,
    );
  }

  const outEntries = readdirSync(OUT_DIR);
  if (outEntries.length === 0) {
    throw new Error(
      `[E2E_ARTIFACT_MISSING] Packaged output is empty at: ${OUT_DIR}. Run \"pnpm run build:e2e\" before e2e tests.`,
    );
  }
};

export const launchPackagedElectronApp = async (): Promise<{
  electronApp: ElectronApplication;
  page: Page;
}> => {
  ensureBuildArtifacts();

  const latestBuild = findLatestBuild();
  const { executable: executablePath, main } = parseElectronApp(latestBuild);

  process.env.CI = 'e2e';
  const electronApp = await electron.launch({
    args: [main],
    executablePath,
    env: {
      ...process.env,
      CI: 'e2e',
    },
  });

  const page = await electronApp.firstWindow();
  return { electronApp, page };
};
