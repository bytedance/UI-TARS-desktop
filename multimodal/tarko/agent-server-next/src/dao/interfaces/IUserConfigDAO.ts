/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserConfig {
  sandboxAllocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
  sandboxPoolQuota: number;
  sharedLinks: string[];
  customSpFragments: string[];
  modelProviders: Array<{
    name: string;
    models: string[];
    displayName?: string;
    apiKey?: string;
    baseURL?: string;
  }>;
}

export interface UserConfigInfo {
  userId: string;
  createdAt: number;
  updatedAt: number;
  config: UserConfig;
}

/**
 * User Configuration Data Access Object interface
 * Provides abstraction for user configuration data operations
 */
export interface IUserConfigDAO {
  /**
   * Get user configuration by user ID
   */
  getUserConfig(userId: string): Promise<UserConfigInfo | null>;

  /**
   * Create user configuration with defaults
   */
  createUserConfig(userId: string, config?: Partial<UserConfig>): Promise<UserConfigInfo>;

  /**
   * Update user configuration
   */
  updateUserConfig(
    userId: string,
    configUpdates: Partial<UserConfig>,
  ): Promise<UserConfigInfo | null>;

  /**
   * Get or create user configuration (ensures config exists)
   */
  getOrCreateUserConfig(userId: string): Promise<UserConfigInfo>;

  /**
   * Delete user configuration
   */
  deleteUserConfig(userId: string): Promise<boolean>;

  /**
   * Get sandbox allocation strategy for user
   */
  getSandboxAllocationStrategy(
    userId: string,
  ): Promise<'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive'>;

  /**
   * Get sandbox pool quota for user
   */
  getSandboxPoolQuota(userId: string): Promise<number>;

  /**
   * Add shared link for user
   */
  addSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null>;

  /**
   * Remove shared link for user
   */
  removeSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null>;

  /**
   * Add custom SP fragment for user
   */
  addCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null>;

  /**
   * Remove custom SP fragment for user
   */
  removeCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null>;

  /**
   * Update model providers for user
   */
  updateModelProviders(
    userId: string,
    providers: UserConfig['modelProviders'],
  ): Promise<UserConfigInfo | null>;
}