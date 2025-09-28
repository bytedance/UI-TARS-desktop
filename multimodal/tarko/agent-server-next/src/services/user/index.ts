/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IUserConfigDAO, UserConfig, UserConfigInfo } from '../../dao/interfaces/IUserConfigDAO';
import { IDAOFactory } from '../../dao/interfaces/IDAOFactory';

// Re-export types for backward compatibility
export type { UserConfig, UserConfigInfo };

/**
 * Service for managing user configurations
 * Now uses DAO pattern for clean separation of concerns
 */
export class UserConfigService {
  private userConfigDAO: IUserConfigDAO;

  constructor(daoFactory: IDAOFactory) {
    this.userConfigDAO = daoFactory.getUserConfigDAO();
  }
  /**
   * Get user configuration by user ID
   */
  async getUserConfig(userId: string): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.getUserConfig(userId);
  }

  /**
   * Create user configuration with defaults
   */
  async createUserConfig(userId: string, config?: Partial<UserConfig>): Promise<UserConfigInfo> {
    return this.userConfigDAO.createUserConfig(userId, config);
  }

  /**
   * Update user configuration
   */
  async updateUserConfig(
    userId: string,
    configUpdates: Partial<UserConfig>,
  ): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.updateUserConfig(userId, configUpdates);
  }

  /**
   * Get or create user configuration (ensures config exists)
   */
  async getOrCreateUserConfig(userId: string): Promise<UserConfigInfo> {
    return this.userConfigDAO.getOrCreateUserConfig(userId);
  }

  /**
   * Delete user configuration
   */
  async deleteUserConfig(userId: string): Promise<boolean> {
    return this.userConfigDAO.deleteUserConfig(userId);
  }

  /**
   * Get sandbox allocation strategy for user
   */
  async getSandboxAllocationStrategy(
    userId: string,
  ): Promise<'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive'> {
    return this.userConfigDAO.getSandboxAllocationStrategy(userId);
  }

  /**
   * Get sandbox pool quota for user
   */
  async getSandboxPoolQuota(userId: string): Promise<number> {
    return this.userConfigDAO.getSandboxPoolQuota(userId);
  }

  /**
   * Add shared link for user
   */
  async addSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.addSharedLink(userId, sharedLink);
  }

  /**
   * Remove shared link for user
   */
  async removeSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.removeSharedLink(userId, sharedLink);
  }

  /**
   * Add custom SP fragment for user
   */
  async addCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.addCustomSpFragment(userId, fragment);
  }

  /**
   * Remove custom SP fragment for user
   */
  async removeCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.removeCustomSpFragment(userId, fragment);
  }

  /**
   * Update model providers for user
   */
  async updateModelProviders(
    userId: string,
    providers: UserConfig['modelProviders'],
  ): Promise<UserConfigInfo | null> {
    return this.userConfigDAO.updateModelProviders(userId, providers);
  }
}
