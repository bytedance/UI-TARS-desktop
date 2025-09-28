/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent Storage implementation type
 *
 * - `memory`: In-memory storage implementation, data will be lost on restart.
 * - `file`: File-based storage implementation, stores data in local files.
 * - `sqlite`: SQLite database storage implementation.
 * - `database`: External database storage implementation.
 * - `mongodb`: MongoDB database storage implementation.
 */
export type AgentStorageImplementationType = 'memory' | 'file' | 'sqlite' | 'database' | 'mongodb';

/**
 * Base agent storage implementation interface
 */
export interface BaseAgentStorageImplementation {
  /**
   * Storage implementation type
   */
  type: AgentStorageImplementationType;
}

/**
 * Memory-based storage implementation
 */
export interface MemoryAgentStorageImplementation extends BaseAgentStorageImplementation {
  type: 'memory';
}

/**
 * File-based storage implementation
 */
export interface FileAgentStorageImplementation extends BaseAgentStorageImplementation {
  type: 'file';
  /**
   * Base directory for SQLite database
   *
   * @defaultValue `~/.tarko`
   */
  baseDir?: string;
  /**
   * File name for the JSON database
   *
   * @defaultValue tarko.json
   */
  fileName?: string;
}

/**
 * SQLite-based storage implementation
 */
export interface SqliteAgentStorageImplementation extends BaseAgentStorageImplementation {
  type: 'sqlite';
  /**
   * Base directory for SQLite database
   *
   * @defaultValue `~/.tarko`
   */
  baseDir?: string;
  /**
   * Database name for SQLite
   *
   * @defaultValue tarko.db
   */
  dbName?: string;
}

/**
 * Database-based storage implementation
 */
export interface DatabaseAgentStorageImplementation extends BaseAgentStorageImplementation {
  type: 'database';
  /**
   * Database connection configuration for database storage
   */
  database: {
    url: string;
    name?: string;
    [key: string]: any;
  };
}

/**
 * MongoDB-based storage implementation
 */
export interface MongoDBAgentStorageImplementation extends BaseAgentStorageImplementation {
  type: 'mongodb';
  /**
   * MongoDB connection uri string
   */
  uri: string;

  /**
   * Additional MongoDB connection options
   */
  options?: {
    dbName?: string;
    user?: string;
    pass?: string;
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    [key: string]: any;
  };
}

/**
 * Union type for all agent storage implementations
 */
export type AgentStorageImplementation =
  | MemoryAgentStorageImplementation
  | FileAgentStorageImplementation
  | SqliteAgentStorageImplementation
  | DatabaseAgentStorageImplementation
  | MongoDBAgentStorageImplementation;

/**
 * Utility type to extract implementation by type
 */
export type AgentStorageImplementationByType<T extends AgentStorageImplementationType> =
  T extends 'memory'
    ? MemoryAgentStorageImplementation
    : T extends 'file'
      ? FileAgentStorageImplementation
      : T extends 'sqlite'
        ? SqliteAgentStorageImplementation
        : T extends 'database'
          ? DatabaseAgentStorageImplementation
          : T extends 'mongodb'
            ? MongoDBAgentStorageImplementation
            : never;

/**
 * Type guard to check if implementation is of specific type
 */
export function isAgentStorageImplementationType<T extends AgentStorageImplementationType>(
  implementation: AgentStorageImplementation,
  type: T,
): implementation is AgentStorageImplementationByType<T> {
  return implementation.type === type;
}
