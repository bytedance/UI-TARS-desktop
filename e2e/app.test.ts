/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { _electron as electron } from 'playwright';
import { expect, test } from 'vitest';

test('app can launch', async () => {
  const electronApp = await electron.launch({ args: ['./dist/main/main.js'] });
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    // This runs in Electron's main process, parameter here is always
    // the result of the require('electron') in the main app script.
    return app.isPackaged;
  });

  expect(isPackaged).toBe(false);

  // Wait for the first BrowserWindow to open
  // and return its Page object
  const window = await electronApp.firstWindow();
  await window.waitForSelector('img[alt="UI-TARS Logo"]', {
    state: 'visible',
    timeout: 15000,
  });

  const buttonElement = await window.$('button');
  expect(await buttonElement?.isVisible()).toBe(true);
  // close app
  await electronApp.close();
});
