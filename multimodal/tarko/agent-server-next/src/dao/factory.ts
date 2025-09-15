/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MongoDBAgentStorageImplementation, SqliteAgentStorageImplementation } from '@tarko/interface';
import { IDAOFactory, StorageBackend } from './interfaces/IDAOFactory';
import { MongoDAOFactory } from './mongodb/MongoDAOFactory';
import { SQLiteDAOFactory } from './sqlite/SQLiteDAOFactory';

/**
 * Factory function to create appropriate DAO factory based on configuration
 */
export function createDAOFactory(
  backend: StorageBackend,
  config: MongoDBAgentStorageImplementation | SqliteAgentStorageImplementation,
): IDAOFactory {
  switch (backend) {
    case 'mongodb':
      return new MongoDAOFactory(config as MongoDBAgentStorageImplementation);
    case 'sqlite':
      return new SQLiteDAOFactory(config as SqliteAgentStorageImplementation);
    default:
      throw new Error(`Unsupported storage backend: ${backend}`);
  }
}

/**
 * Helper function to determine storage backend from config
 */
export function getStorageBackend(
  config: MongoDBAgentStorageImplementation | SqliteAgentStorageImplementation,
): StorageBackend {
  if ('uri' in config) {
    return 'mongodb';
  } else if ('baseDir' in config || 'dbName' in config) {
    return 'sqlite';
  } else {
    throw new Error('Unable to determine storage backend from configuration');
  }
}