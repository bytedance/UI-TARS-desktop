/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentStorageImplementation, MongoDBAgentStorageImplementation, SqliteAgentStorageImplementation } from '@tarko/interface';
import { IDAOFactory, StorageBackend } from './interfaces/IDAOFactory';
import { MongoDAOFactory } from './mongodb/MongoDAOFactory';
import { SQLiteDAOFactory } from './sqlite/SQLiteDAOFactory';

/**
 * Factory function to create appropriate DAO factory based on configuration
 * @deprecated Use createDAOFactory(config) instead
 */
export function createDAOFactory(
  backend: StorageBackend,
  config: MongoDBAgentStorageImplementation | SqliteAgentStorageImplementation,
): IDAOFactory;

/**
 * Create a DAO factory based on configuration (replaces createStorageProvider)
 */
export function createDAOFactory(config: AgentStorageImplementation): IDAOFactory;

export function createDAOFactory(
  configOrBackend: AgentStorageImplementation | StorageBackend,
  config?: MongoDBAgentStorageImplementation | SqliteAgentStorageImplementation,
): IDAOFactory {
  // Handle old signature for backward compatibility
  if (typeof configOrBackend === 'string' && config) {
    switch (configOrBackend) {
      case 'mongodb':
        return new MongoDAOFactory(config as MongoDBAgentStorageImplementation);
      case 'sqlite':
        return new SQLiteDAOFactory(config as SqliteAgentStorageImplementation);
      default:
        throw new Error(`Unsupported storage backend: ${configOrBackend}`);
    }
  }
  
  // Handle new signature
  const storageConfig = configOrBackend as AgentStorageImplementation;
  switch (storageConfig.type) {
    case 'mongodb':
      return new MongoDAOFactory(storageConfig as MongoDBAgentStorageImplementation);
    case 'sqlite':
      return new SQLiteDAOFactory(storageConfig as SqliteAgentStorageImplementation);
    default:
      throw new Error(`Unsupported storage type: ${(storageConfig as any).type}`);
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