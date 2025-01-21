/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function ensureDirectoryExistence(filePath: string) {
  const directoryPath = dirname(filePath);

  if (existsSync(directoryPath)) {
    return true;
  }

  mkdirSync(directoryPath, { recursive: true });
  return true;
}

export function tplReplacer(
  tpl: string,
  obj: Record<string, string | undefined>,
) {
  return tpl.replace(/^\s*{{\s*([_\w\-]+)\s*}}\s*$/gm, (_, key) => {
    return obj[key] || `{{${key}}}`; // keep the placeholder if not found
  });
}

export const fileContentOfPath = (path: string) => {
  const filePath = join(__dirname, path);
  return readFileSync(filePath, 'utf-8');
};

export function safeCopyFile(src: string, dest: string) {
  ensureDirectoryExistence(dest);
  copyFileSync(src, dest);
  console.log(`HTML file copied to core successfully: ${dest}`);
}
