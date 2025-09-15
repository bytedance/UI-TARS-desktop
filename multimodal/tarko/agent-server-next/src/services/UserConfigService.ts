/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserConfigDocument } from '../storage/MongoDBStorageProvider/MongoDBSchemas';
import { MongoDBStorageProvider } from '../storage/MongoDBStorageProvider/MongoDBStorageProvider';
import { Model } from 'mongoose';

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
 * Service for managing user configurations
 */
export class UserConfigService {
  private storageProvider: MongoDBStorageProvider;

  constructor(storageProvider: MongoDBStorageProvider) {
    this.storageProvider = storageProvider;
  }

  private getUserConfigModel(): Model<UserConfigDocument> {
    return this.storageProvider.getUserConfigModel();
  }
  /**
   * Get user configuration by user ID
   */
  async getUserConfig(userId: string): Promise<UserConfigInfo | null> {
    try {
      const UserConfigModel = this.getUserConfigModel();
      const userConfig = await UserConfigModel.findOne({ userId }).lean();
      if (!userConfig) {
        return null;
      }

      return {
        userId: userConfig.userId,
        createdAt: userConfig.createdAt,
        updatedAt: userConfig.updatedAt,
        config: userConfig.config,
      };
    } catch (error) {
      console.error('Failed to get user config:', error);
      throw new Error('Failed to retrieve user configuration');
    }
  }

  /**
   * Create user configuration with defaults
   */
  async createUserConfig(userId: string, config?: Partial<UserConfig>): Promise<UserConfigInfo> {
    try {
      const UserConfigModel = this.getUserConfigModel();
      const now = Date.now();
      const defaultConfig: UserConfig = {
        sandboxAllocationStrategy: 'Shared-Pool',
        sandboxPoolQuota: 5,
        sharedLinks: [],
        customSpFragments: [],
        modelProviders: [],
      };

      const finalConfig: UserConfig = {
        ...defaultConfig,
        ...config,
      };

      const userConfig = new UserConfigModel({
        userId,
        createdAt: now,
        updatedAt: now,
        config: finalConfig,
      });

      const saved = await userConfig.save();

      return {
        userId: saved.userId,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        config: saved.config,
      };
    } catch (error) {
      console.error('Failed to create user config:', error);
      if ((error as any).code === 11000) {
        throw new Error('User configuration already exists');
      }
      throw new Error('Failed to create user configuration');
    }
  }

  /**
   * Update user configuration
   */
  async updateUserConfig(
    userId: string,
    configUpdates: Partial<UserConfig>,
  ): Promise<UserConfigInfo | null> {
    try {
      const UserConfigModel = this.getUserConfigModel();
      const now = Date.now();

      const updated = await UserConfigModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            updatedAt: now,
            ...Object.fromEntries(
              Object.entries(configUpdates).map(([key, value]) => [`config.${key}`, value]),
            ),
          },
        },
        { new: true, lean: true },
      );

      if (!updated) {
        return null;
      }

      return {
        userId: updated.userId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        config: updated.config,
      };
    } catch (error) {
      console.error('Failed to update user config:', error);
      throw new Error('Failed to update user configuration');
    }
  }

  /**
   * Get or create user configuration (ensures config exists)
   */
  async getOrCreateUserConfig(userId: string): Promise<UserConfigInfo> {
    let userConfig = await this.getUserConfig(userId);

    if (!userConfig) {
      userConfig = await this.createUserConfig(userId);
    }

    return userConfig;
  }

  /**
   * Delete user configuration
   */
  async deleteUserConfig(userId: string): Promise<boolean> {
    try {
      const UserConfigModel = this.getUserConfigModel();
      const result = await UserConfigModel.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete user config:', error);
      throw new Error('Failed to delete user configuration');
    }
  }

  /**
   * Get sandbox allocation strategy for user
   */
  async getSandboxAllocationStrategy(
    userId: string,
  ): Promise<'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive'> {
    const config = await this.getOrCreateUserConfig(userId);
    return config.config.sandboxAllocationStrategy;
  }

  /**
   * Get sandbox pool quota for user
   */
  async getSandboxPoolQuota(userId: string): Promise<number> {
    const config = await this.getOrCreateUserConfig(userId);
    return config.config.sandboxPoolQuota;
  }

  /**
   * Add shared link for user
   */
  async addSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedLinks = [...userConfig.config.sharedLinks];
    if (!updatedLinks.includes(sharedLink)) {
      updatedLinks.push(sharedLink);
    }

    return this.updateUserConfig(userId, { sharedLinks: updatedLinks });
  }

  /**
   * Remove shared link for user
   */
  async removeSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedLinks = userConfig.config.sharedLinks.filter((link) => link !== sharedLink);
    return this.updateUserConfig(userId, { sharedLinks: updatedLinks });
  }

  /**
   * Add custom SP fragment for user
   */
  async addCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedFragments = [...userConfig.config.customSpFragments];
    if (!updatedFragments.includes(fragment)) {
      updatedFragments.push(fragment);
    }

    return this.updateUserConfig(userId, { customSpFragments: updatedFragments });
  }

  /**
   * Remove custom SP fragment for user
   */
  async removeCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedFragments = userConfig.config.customSpFragments.filter((f) => f !== fragment);
    return this.updateUserConfig(userId, { customSpFragments: updatedFragments });
  }

  /**
   * Update model providers for user
   */
  async updateModelProviders(
    userId: string,
    providers: UserConfig['modelProviders'],
  ): Promise<UserConfigInfo | null> {
    return this.updateUserConfig(userId, { modelProviders: providers });
  }
}
