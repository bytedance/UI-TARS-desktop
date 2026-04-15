/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { execSync } from 'node:child_process';

/**
 * Sanitize an argument string for shell command safety.
 * Only allows alphanumeric characters, dots, underscores, and hyphens.
 */
function sanitizeArg(arg: string): string {
  if (!/^[a-zA-Z0-9._:-]+$/.test(arg)) {
    throw new Error(`Invalid argument: "${arg}" - only alphanumeric, ".", "_", "-", ":" are allowed`);
  }
  return arg;
}

/**
 * Launch an Android app using ADB monkey command
 */
export function launchApp(deviceId: string, pkg: string): void {
  const safeDeviceId = sanitizeArg(deviceId);
  const safePkg = sanitizeArg(pkg);
  execSync(`adb -s ${safeDeviceId} shell am force-stop ${safePkg}`, { stdio: 'pipe' });
  execSync(
    `adb -s ${safeDeviceId} shell monkey -p ${safePkg} -c android.intent.category.LAUNCHER 1`,
    { stdio: 'pipe' },
  );
}

/**
 * Tap at coordinates on the device
 */
export function adbClick(deviceId: string, x: number, y: number): void {
  const safeDeviceId = sanitizeArg(deviceId);
  execSync(`adb -s ${safeDeviceId} shell input tap ${x} ${y}`, { stdio: 'pipe' });
}

/**
 * Send back key event
 */
export function adbBack(deviceId: string): void {
  const safeDeviceId = sanitizeArg(deviceId);
  execSync(`adb -s ${safeDeviceId} shell input keyevent KEYCODE_BACK`, { stdio: 'pipe' });
}

/**
 * Send home key event
 */
export function adbHome(deviceId: string): void {
  const safeDeviceId = sanitizeArg(deviceId);
  execSync(`adb -s ${safeDeviceId} shell input keyevent KEYCODE_HOME`, { stdio: 'pipe' });
}

/**
 * Wake up the device
 */
export function adbWake(deviceId: string): void {
  const safeDeviceId = sanitizeArg(deviceId);
  execSync(`adb -s ${safeDeviceId} shell input keyevent KEYCODE_WAKEUP`, { stdio: 'pipe' });
}

/**
 * Query the physical screen size of the device
 */
export function adbScreenSize(deviceId: string): { width: number; height: number } | null {
  const safeDeviceId = sanitizeArg(deviceId);
  try {
    const output = execSync(`adb -s ${safeDeviceId} shell wm size`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = output.match(/Physical size:\s*(\d+)x(\d+)/i);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a promise with a timeout, rejecting if it exceeds the limit
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation',
): Promise<T> {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`${label} timed out after ${ms}ms`);
    }),
  ]);
}
