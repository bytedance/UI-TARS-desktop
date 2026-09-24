/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from 'child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

describe('standalone CLI version', () => {
  let fixtureDir: string | undefined;

  afterEach(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
      fixtureDir = undefined;
    }
  });

  it('passes the package version to AgentCLI', () => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'tarko-cli-version-'));
    const binDir = path.join(fixtureDir, 'bin');
    const distDir = path.join(fixtureDir, 'dist');
    mkdirSync(binDir);
    mkdirSync(distDir);

    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
    );
    writeFileSync(
      path.join(fixtureDir, 'package.json'),
      JSON.stringify({ version: packageJson.version }),
    );
    copyFileSync(path.resolve(__dirname, '../bin/cli.js'), path.join(binDir, 'cli.js'));
    writeFileSync(
      path.join(distDir, 'index.js'),
      `exports.AgentCLI = class AgentCLI {
  constructor(options) {
    this.options = options;
  }

  bootstrap() {
    process.stdout.write(\`tarko/\${this.options.versionInfo?.version}\`);
  }
};
`,
    );

    const output = execFileSync(process.execPath, [path.join(binDir, 'cli.js'), '--version'], {
      encoding: 'utf8',
    });

    expect(output).toBe(`tarko/${packageJson.version}`);
  });
});
