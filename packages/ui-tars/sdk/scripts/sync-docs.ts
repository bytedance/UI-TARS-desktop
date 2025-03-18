/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs/promises';
import * as path from 'path';

const packageDirPath = path.join(__dirname, '..');
const docFilePath = path.join(packageDirPath, '../../../docs/sdk.md');

async function syncDocs() {
  try {
    const content = await fs.readFile(docFilePath, 'utf-8');

    await fs.writeFile(path.join(packageDirPath, 'README.md'), content);

    console.log('✨ 文档已从 docs/sdk.md 覆盖写入到 packages/sdk/README.md');
  } catch (error) {
    console.error('❌ 同步文档失败:', error);
    process.exit(1);
  }
}

syncDocs();
