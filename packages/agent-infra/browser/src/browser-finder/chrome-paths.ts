/**
 * The following code is modified based on
 * https://github.com/shirshak55/edge-paths/blob/master/index.ts
 *
 * MIT Licensed
 * Copyright (c) 2020 Shirshak
 * https://github.com/shirshak55/edge-paths/blob/master/LICENSE
 */

/**
 * Q: Why not use [find-chrome-bin](https://github.com/mbalabash/find-chrome-bin) or [chrome-finder](https://github.com/gwuhaolin/chrome-finder)?
 *
 * A: The `find-chrome-bin` or `chrome-finder` libraries execute `lsregister -dump` under Darwin (macOS),
 *    which is a time-consuming operation (taking up to 6 seconds on my computer!).
 *    Since this process is performed during the app's startup, such a delay is unacceptable.
 */
import { existsSync } from 'fs';
import { sep, join } from 'path';
import which from 'which';

const platform = process.platform;

function getChromeOnLinux(
  list: (
    | 'google-chrome'
    | 'google-chrome-stable'
    | 'google-chrome-beta'
    | 'google-chrome-dev'
    | 'chromium-browser'
    | 'chromium'
  )[],
): string | null {
  // TODO: scan desktop installation folders, the `grep` operation can be somewhat time-consuming.
  // https://github.com/mbalabash/find-chrome-bin/blob/main/src/linux/index.js
  try {
    for (const name of list) {
      const path = which.sync(name);
      return path;
    }
  } catch (e) {}

  return null;
}

function getChromeOnWindows(
  name: 'Chrome' | 'Chrome Beta' | 'Chrome Dev' | 'Chrome SxS',
): string | null {
  const suffix = `${sep}Google${sep}${name}${sep}Application${sep}chrome.exe`;

  const prefixes = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
  ].filter(Boolean);

  for (const prefix of prefixes) {
    const chrome = join(prefix!, suffix);
    if (existsSync(chrome)) {
      return chrome;
    }
  }

  return null;
}

function getChromeOnDarwin(
  name:
    | 'Google Chrome'
    | 'Google Chrome Beta'
    | 'Google Chrome Dev'
    | 'Google Chrome Canary',
): string | null {
  const suffix = `/Applications/${name}.app/Contents/MacOS/${name}`;
  const prefixes = ['', process.env.HOME].filter((item) => item !== undefined);

  for (const prefix of prefixes) {
    const chromePath = join(prefix, suffix);
    if (existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

const chromePaths = {
  chrome: {
    linux: () => getChromeOnLinux(['google-chrome-stable', 'google-chrome']),
    darwin: () => getChromeOnDarwin('Google Chrome'),
    win32: () => getChromeOnWindows('Chrome'),
  },
  beta: {
    linux: () => getChromeOnLinux(['google-chrome-beta']),
    darwin: () => getChromeOnDarwin('Google Chrome Beta'),
    win32: () => getChromeOnWindows('Chrome Beta'),
  },
  dev: {
    linux: () => getChromeOnLinux(['google-chrome-dev']),
    darwin: () => getChromeOnDarwin('Google Chrome Dev'),
    win32: () => getChromeOnWindows('Chrome Dev'),
  },
  canary: {
    linux: () => getChromeOnLinux(['chromium-browser', 'chromium']),
    darwin: () => getChromeOnDarwin('Google Chrome Canary'),
    win32: () => getChromeOnWindows('Chrome SxS'),
  },
};

function getChromePath() {
  const chrome = chromePaths.chrome;

  if (platform && Object.keys(chrome).includes(platform)) {
    const pth = chrome[platform as keyof typeof chrome]();
    if (pth) {
      return pth;
    }
  }
}

function getChromeBetaPath() {
  const beta = chromePaths.beta;

  if (platform && Object.keys(beta).includes(platform)) {
    const pth = beta[platform as keyof typeof beta]();
    if (pth) {
      return pth;
    }
  }
}

function getChromeDevPath() {
  const dev = chromePaths.dev;

  if (platform && Object.keys(dev).includes(platform)) {
    const pth = dev[platform as keyof typeof dev]();
    if (pth) {
      return pth;
    }
  }
}

function getChromeCanaryPath() {
  const canary = chromePaths.canary;

  if (platform && Object.keys(canary).includes(platform)) {
    const pth = canary[platform as keyof typeof canary]();
    if (pth) {
      return pth;
    }
  }
}

export function getAnyChromeStable(): string {
  const chrome = getChromePath();
  if (chrome) {
    return chrome;
  }

  const beta = getChromeBetaPath();
  if (beta) {
    return beta;
  }

  const dev = getChromeDevPath();
  if (dev) {
    return dev;
  }

  const canary = getChromeCanaryPath();
  if (canary) {
    return canary;
  }

  const error = new Error('Unable to find any chrome browser.');
  error.name = 'ChromePathsError';
  throw error;
}
