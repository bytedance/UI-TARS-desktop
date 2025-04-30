/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import os from 'os';

import type { KeyInput, Page, BrowserType } from '@agent-infra/browser';

function isMacChrome(browser: BrowserType) {
  return os.platform() === 'darwin' && browser === 'chrome';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Only adapt for a few common shortcuts.
 *
 * Mac shortcuts list: https://support.apple.com/zh-cn/102650
 * CDP: https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchKeyEvent
 * Commands: https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/commands/editor_command_names.h
 */
const ShortcutsMap = new Map<string, { key: KeyInput; commands: string }>([
  ['Meta+KeyA', { key: 'KeyA', commands: 'SelectAll' }],
  ['Meta+KeyX', { key: 'KeyX', commands: 'Cut' }],
  ['Meta+KeyC', { key: 'KeyC', commands: 'Copy' }],
  ['Meta+KeyV', { key: 'KeyV', commands: 'Paste' }],
  ['Meta+KeyZ', { key: 'KeyZ', commands: 'Undo' }],
  ['Meta+KeyY', { key: 'KeyY', commands: 'Redo' }],
  ['Meta+Shift+KeyZ', { key: 'KeyZ', commands: 'Redo' }],
  ['Shift+Meta+KeyZ', { key: 'KeyZ', commands: 'Redo' }],
]);

export async function shortcuts(
  page: Page,
  shortcuts: KeyInput[],
  browser: BrowserType,
) {
  if (shortcuts.length === 1) {
    await page.keyboard.down(shortcuts[0]);
    await delay(100);
    await page.keyboard.up(shortcuts[0]);

    return;
  }

  /**
   * There are some issues with simulating system shortcuts on macOS using CDP.
   * Here, we adapt a few common shortcuts.
   *
   * https://github.com/puppeteer/puppeteer/issues/776
   */
  if (isMacChrome(browser)) {
    const matched = ShortcutsMap.get(shortcuts.join('+'));
    if (matched) {
      await page.keyboard.down(matched.key, { commands: [matched.commands] });
      await delay(100);
      await page.keyboard.up(matched.key);

      return;
    }
  }

  /**
   * System Shortcuts
   *
   * Mac:   firefox
   * Win:   firefox, chrome
   * Linux: firefox, chrome (no test)
   *
   *
   * Browser App Shortcuts
   *
   * Mac:   firefox, chrome
   * Win:   firefox, chrome
   * Linux: firefox, chrome (no test)
   */
  for (const key of shortcuts) {
    await page.keyboard.down(key);
  }
  await delay(100);
  for (const key of shortcuts.reverse()) {
    await page.keyboard.up(key);
  }
}
