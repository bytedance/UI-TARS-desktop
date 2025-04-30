/**
 * The following code is modified based on
 * https://github.com/shirshak55/edge-paths/blob/master/index.ts
 *
 * MIT Licensed
 * Copyright (c) 2020 Shirshak
 * https://github.com/shirshak55/edge-paths/blob/master/LICENSE
 */
import { existsSync } from 'fs';
import { sep, join } from 'path';
import which from 'which';

const platform = process.platform;

function getFirefoxOnLinux(name: 'firefox'): string | null {
  try {
    const path = which.sync(name);
    return path;
  } catch (e) {}

  return null;
}

function getFirefoxOnWindows(
  name: 'Mozilla Firefox' | 'Firefox Developer Edition' | 'Firefox Nightly',
): string | null {
  const suffix = `${sep}${name}${sep}firefox.exe`;

  const prefixes = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
  ].filter(Boolean);

  for (const prefix of prefixes) {
    const firefoxPath = join(prefix!, suffix);
    if (existsSync(firefoxPath)) {
      return firefoxPath;
    }
  }

  return null;
}

function getFireFoxOnDarwin(
  name: 'Firefox' | 'Firefox Developer Edition' | 'Firefox Nightly',
): string | null {
  const suffix = `/Applications/${name}.app/Contents/MacOS/firefox`;
  const prefixes = ['', process.env.HOME].filter((item) => item !== undefined);

  for (const prefix of prefixes) {
    const firefoxPath = join(prefix, suffix);
    if (existsSync(firefoxPath)) {
      return firefoxPath;
    }
  }

  return null;
}

const firefoxPaths = {
  firefox: {
    linux: () => getFirefoxOnLinux('firefox'), // stable/beta/dev/nightly use same 'firefox' app name
    darwin: () => getFireFoxOnDarwin('Firefox'),
    win32: () => getFirefoxOnWindows('Mozilla Firefox'),
  },
  // beta and stable use same file path
  dev: {
    darwin: () => getFireFoxOnDarwin('Firefox Developer Edition'),
    win32: () => getFirefoxOnWindows('Firefox Developer Edition'),
  },
  nightly: {
    darwin: () => getFireFoxOnDarwin('Firefox Nightly'),
    win32: () => getFirefoxOnWindows('Firefox Nightly'),
  },
};

function getFirefoxPath() {
  const firefox = firefoxPaths.firefox;

  if (platform && Object.keys(firefox).includes(platform)) {
    const pth = firefox[platform as keyof typeof firefox]();
    if (pth) {
      return pth;
    }
  }
}

function getFirefoxDevPath() {
  const dev = firefoxPaths.dev;

  if (platform && Object.keys(dev).includes(platform)) {
    const pth = dev[platform as keyof typeof dev]();
    if (pth) {
      return pth;
    }
  }
}

function getFirefoxNightlyPath() {
  const nightly = firefoxPaths.nightly;

  if (platform && Object.keys(nightly).includes(platform)) {
    const pth = nightly[platform as keyof typeof nightly]();
    if (pth) {
      return pth;
    }
  }
}

export function getAnyFirefoxStable(): string {
  const firefox = getFirefoxPath();
  if (firefox) {
    return firefox;
  }

  const dev = getFirefoxDevPath();
  if (dev) {
    return dev;
  }

  const canary = getFirefoxNightlyPath();
  if (canary) {
    return canary;
  }

  const error = new Error('Unable to find any firefox browser.');
  error.name = 'FirefoxPathsError';
  throw error;
}
