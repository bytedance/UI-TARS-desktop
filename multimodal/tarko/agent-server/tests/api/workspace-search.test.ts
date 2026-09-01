/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('fs');
vi.unmock('path');

import { searchWorkspaceItems } from '../../src/api/controllers/sessions';

describe('workspace search ordering', () => {
  let workspacePath: string;

  beforeEach(async () => {
    workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'tarko-workspace-search-'));

    await Promise.all([
      fs.mkdir(path.join(workspacePath, 'dist'), { recursive: true }),
      fs.mkdir(path.join(workspacePath, 'src', 'runtime'), { recursive: true }),
    ]);

    await Promise.all([
      fs.writeFile(path.join(workspacePath, 'dist', 'repository-context.d.ts'), ''),
      fs.writeFile(path.join(workspacePath, 'dist', 'repository-context.d.ts.map'), ''),
      fs.writeFile(path.join(workspacePath, 'dist', 'repository-context.js'), ''),
      fs.writeFile(path.join(workspacePath, 'dist', 'repository-context.js.map'), ''),
      fs.writeFile(path.join(workspacePath, 'dist', 'repository-context.mjs'), ''),
      ...Array.from({ length: 25 }, (_, index) =>
        fs.writeFile(path.join(workspacePath, 'dist', `repository-context-${index}.js`), ''),
      ),
      fs.writeFile(path.join(workspacePath, 'src', 'runtime', 'repository-context.ts'), ''),
    ]);
  });

  afterEach(async () => {
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  async function search(query: string) {
    const json = vi.fn();
    const req = {
      query: {
        sessionId: 'test-session',
        q: query,
        type: 'file',
      },
      app: {
        locals: {
          server: {
            getCurrentWorkspace: () => workspacePath,
          },
        },
      },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json,
    } as unknown as Response;

    await searchWorkspaceItems(req, res);

    expect(json).toHaveBeenCalledOnce();
    return json.mock.calls[0][0].items as Array<{ relativePath: string }>;
  }

  it('ranks source files ahead of matching dist artifacts', async () => {
    const results = await search('context');
    const paths = results.map((item) => item.relativePath);

    expect(paths).toHaveLength(20);
    expect(paths[0]).toBe('src/runtime/repository-context.ts');
    expect(paths.slice(1).every((resultPath) => resultPath.startsWith('dist/'))).toBe(true);
  });

  it('keeps dist artifacts searchable when the query names dist explicitly', async () => {
    const results = await search('dist');

    expect(results).not.toHaveLength(0);
    expect(results.every((item) => item.relativePath.startsWith('dist/'))).toBe(true);
  });

  it('preserves relevance ordering when there is no source match', async () => {
    await fs.mkdir(path.join(workspacePath, 'notes'));
    await fs.writeFile(path.join(workspacePath, 'notes', 'repository-context-0.js.notes.md'), '');

    const results = await search('repository-context-0.js');

    expect(results[0].relativePath).toBe('dist/repository-context-0.js');
  });
});
