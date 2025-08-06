/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageProvider } from './types';
import { MemoryStorageProvider } from './MemoryStorageProvider';
import { FileStorageProvider } from './FileStorageProvider';
import { SQLiteStorageProvider } from './SQLiteStorageProvider';
import { AgentStorageImplementation, TARKO_CONSTANTS } from '@tarko/interface';

export * from './types';

/**
 * Creates and returns a storage provider based on the options
 * @param options Storage configuration options
 */
export function createStorageProvider(options?: AgentStorageImplementation): StorageProvider {
  if (!options || options.type === 'memory') {
    return new MemoryStorageProvider();
  }

  if (options.type === 'file') {
    return new FileStorageProvider(options);
  }

  if (options.type === 'sqlite') {
    return new SQLiteStorageProvider(options);
  }

  if (options.type === 'database') {
    throw new Error('Database storage not implemented');
  }

  // @ts-expect-error intercept unexpected storage type
  throw new Error(`Unknown storage type: ${options.type}`);
}
