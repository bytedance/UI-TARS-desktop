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
   * Get UserConfig DAO instance
   */
  getUserConfigDAO(): IUserConfigDAO;

  /**
   * Get Session DAO instance
   */
  getSessionDAO(): ISessionDAO;

  /**
   * Get Event DAO instance
   */
  getEventDAO(): IEventDAO;

  /**
   * Get SandboxAllocation DAO instance
   */
  getSandboxAllocationDAO(): ISandboxAllocationDAO;

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

  /**
   * Health check for the underlying storage
   */
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