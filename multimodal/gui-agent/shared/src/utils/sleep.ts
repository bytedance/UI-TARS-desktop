/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sleeps for a specified duration
 * @param time The duration to sleep
 * @param unit The time unit ('ms' for milliseconds or 's' for seconds), defaults to 'ms'
 *
 * Examples:
 * ```
 * await sleep(1000); // Sleeps for 1000 milliseconds (1 second)
 * await sleep(1, 's'); // Sleeps for 1 second
 * await sleep(500, 'ms'); // Sleeps for 500 milliseconds
 * ```
 */
export async function sleep(time: number, unit: 'ms' | 's' = 'ms'): Promise<void> {
  const ms = unit === 's' ? time * 1000 : time;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
