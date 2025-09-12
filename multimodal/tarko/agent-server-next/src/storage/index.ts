/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentStorageImplementation,
  MongoDBAgentStorageImplementation,
  SqliteAgentStorageImplementation,
} from '@tarko/interface';
import { StorageProvider } from './types';
import { MongoDBStorageProvider } from './MongoDBStorageProvider';
import { SQLiteStorageProvider } from './SQLiteStorageProvider';

/**
 * Create a storage provider based on configuration
 */
export function createStorageProvider(config: AgentStorageImplementation): StorageProvider {
  switch (config.type) {
    case 'mongodb':
      return new MongoDBStorageProvider(config as MongoDBAgentStorageImplementation);
    case 'sqlite':
      return new SQLiteStorageProvider(config as SqliteAgentStorageImplementation);
    default:
      throw new Error(`Unsupported storage type: ${(config as any).type}`);
  }
}

// Re-export types and classes
export type { StorageProvider } from './types';
export { MongoDBStorageProvider } from './MongoDBStorageProvider';
export { SQLiteStorageProvider } from './SQLiteStorageProvider';
