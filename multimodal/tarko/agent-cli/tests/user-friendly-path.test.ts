/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { toUserFriendlyPath } from '../src/utils/misc';

const home = os.homedir();
const under = (...parts: string[]) => path.join(home, ...parts);

describe('toUserFriendlyPath', () => {
  it('shortens a path inside the home directory', () => {
    expect(toUserFriendlyPath(under('project', 'a.ts'))).toBe(`~${path.sep}project${path.sep}a.ts`);
  });

  it('shortens the home directory itself', () => {
    expect(toUserFriendlyPath(home)).toBe('~');
  });

  it('does not shorten a sibling whose name merely extends the home directory name', () => {
    const sibling = `${home}2${path.sep}project${path.sep}a.ts`;

    expect(sibling.startsWith(home)).toBe(true);
    expect(toUserFriendlyPath(sibling)).toBe(sibling);
  });

  it('does not shorten an unrelated path', () => {
    const unrelated = path.resolve(path.sep, 'var', 'lib', 'notes', 'x.md');

    expect(unrelated.startsWith(home)).toBe(false);
    expect(toUserFriendlyPath(unrelated)).toBe(unrelated);
  });
});
