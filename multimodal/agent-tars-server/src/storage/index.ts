/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageProvider, StorageOptions } from './types';
import { MemoryStorageProvider } from './memory-storage';
import { FileStorageProvider } from './file-storage';
import { SQLiteStorageProvider } from './sqlite-storage';

export * from './types';
export * from './memory-storage';
export * from './file-storage';
export * from './sqlite-storage';
export * from './database-storage';

/**
 * Creates and returns a storage provider based on the options
 * @param options Storage configuration options
 * @returns Configured storage provider
 */
export function createStorageProvider(options?: StorageOptions): StorageProvider {
  if (!options || options.type === 'memory') {
    return new MemoryStorageProvider();
  }

  if (options.type === 'file') {
    return new FileStorageProvider(options.path);
  }

  if (options.type === 'sqlite') {
    return new SQLiteStorageProvider(options.path);
  }

  if (options.type === 'database') {
    // Database storage not implemented yet
    throw new Error('Database storage not implemented');
  }

  throw new Error(`Unknown storage type: ${(options as any).type}`);
}
