/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Helper function to read from stdin
 */
export async function readFromStdin(): Promise<string> {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];

    if (process.stdin.isTTY) {
      return resolve('');
    }

    process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString().trim());
    });

    process.stdin.resume();
  });
}
