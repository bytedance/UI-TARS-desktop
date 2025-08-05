/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageProvider, AgentServerStorageOptions } from './types';
import { MemoryStorageProvider } from './MemoryStorageProvider';
import { FileStorageProvider } from './FileStorageProvider';
import { SQLiteStorageProvider } from './SQLiteStorageProvider';
import { TARKO_CONSTANTS } from '@tarko/interface';

export * from './types';

/**
 * Creates and returns a storage provider based on the options
 * @param options Storage configuration options
 * @param globalStorageDir Global storage directory name
 * @returns Configured storage provider
 */
export function createStorageProvider(
  options?: AgentServerStorageOptions,
  globalStorageDir: string = TARKO_CONSTANTS.GLOBAL_STORAGE_DIR,
): StorageProvider {
  if (!options || options.type === 'memory') {
    return new MemoryStorageProvider();
  }

  if (options.type === 'file') {
    return new FileStorageProvider(options.path, globalStorageDir);
  }

  if (options.type === 'sqlite') {
    return new SQLiteStorageProvider(options.path, globalStorageDir);
  }

  if (options.type === 'database') {
    throw new Error('Database storage not implemented');
  }

  throw new Error(`Unknown storage type: ${options.type}`);
}
