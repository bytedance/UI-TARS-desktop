/**
 * The following code is modified based on
 * https://github.com/sindresorhus/find-up-simple/blob/main/index.js
 *
 * MIT License
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * https://github.com/sindresorhus/find-up-simple/blob/main/license
 */

import process from 'node:process';
import fsPromises from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const toPath = (urlOrPath: string | URL) =>
  urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;

export async function findUp(
  name: string,
  {
    cwd = process.cwd(),
    type = 'file',
    stopAt,
  }: {
    cwd?: string | URL;
    type?: string;
    stopAt?: string | URL;
  } = {},
) {
  let directory = path.resolve(toPath(cwd) ?? '');
  const { root } = path.parse(directory);
  stopAt = path.resolve(directory, toPath(stopAt ?? root));
  const isAbsoluteName = path.isAbsolute(name);

  while (directory) {
    const filePath = isAbsoluteName ? name : path.join(directory, name);
    try {
      const stats = await fsPromises.stat(filePath); // eslint-disable-line no-await-in-loop
      if (
        (type === 'file' && stats.isFile()) ||
        (type === 'directory' && stats.isDirectory())
      ) {
        return filePath;
      }
    } catch {}

    if (directory === stopAt || directory === root) {
      break;
    }

    directory = path.dirname(directory);
  }
}

export function findUpSync(
  name: string,
  // @ts-ignore
  { cwd = process.cwd(), type = 'file', stopAt } = {},
) {
  let directory = path.resolve(toPath(cwd) ?? '');
  const { root } = path.parse(directory);
  stopAt = path.resolve(directory, toPath(stopAt) ?? root);
  const isAbsoluteName = path.isAbsolute(name);

  while (directory) {
    const filePath = isAbsoluteName ? name : path.join(directory, name);

    try {
      const stats = fs.statSync(filePath, { throwIfNoEntry: false });
      if (
        (type === 'file' && stats?.isFile()) ||
        (type === 'directory' && stats?.isDirectory())
      ) {
        return filePath;
      }
    } catch {}

    if (directory === stopAt || directory === root) {
      break;
    }

    directory = path.dirname(directory);
  }
}
