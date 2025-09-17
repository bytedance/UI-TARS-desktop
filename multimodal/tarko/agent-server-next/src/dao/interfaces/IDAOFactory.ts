/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IUserConfigDAO } from './IUserConfigDAO';
import { ISessionDAO } from './ISessionDAO';
import { IEventDAO } from './IEventDAO';
import { ISandboxAllocationDAO } from './ISandboxAllocationDAO';

/**
 * DAO Factory interface
 * Provides abstraction for creating and managing DAO instances
 * Supports different storage backends (MongoDB, SQLite, etc.)
 */
export interface IDAOFactory {
  /**
   * Initialize the DAO factory and underlying connections
   */
  initialize(): Promise<void>;

  /**
   * Check if the DAO factory is initialized
   */
  isInitialized(): boolean;

  /**
   * Close all connections and cleanup resources
   */
  close(): Promise<void>;
  getUserConfigDAO(): IUserConfigDAO;
  getSessionDAO(): ISessionDAO;
  getEventDAO(): IEventDAO;
  getSandboxAllocationDAO(): ISandboxAllocationDAO;
  healthCheck(): Promise<{ healthy: boolean; message?: string; [key: string]: any }>;

}

/**
 * Storage backend type for DAO factory configuration
 */
export type StorageBackend = 'mongodb' | 'sqlite';

/**
 * DAO Factory configuration interface
 */
export interface DAOFactoryConfig {
  backend: StorageBackend;
  connectionConfig: any; // Storage-specific connection configuration
}