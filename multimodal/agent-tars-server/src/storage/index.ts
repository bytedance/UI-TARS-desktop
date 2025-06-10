/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageProvider, ServerStorageOptions } from './types';
import { MemoryStorageProvider } from './MemoryStorageProvider';
import { FileStorageProvider } from './FileStorageProvider';
import { SQLiteStorageProvider } from './SQLiteStorageProvider';

export * from './types';

/**
 * Creates and returns a storage provider based on the options
 * @param options Storage configuration options
 * @returns Configured storage provider
 */
export function createStorageProvider(options?: ServerStorageOptions): StorageProvider {
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
    throw new Error('Database storage not implemented');
  }

  throw new Error(`Unknown storage type: ${options.type}`);
}
