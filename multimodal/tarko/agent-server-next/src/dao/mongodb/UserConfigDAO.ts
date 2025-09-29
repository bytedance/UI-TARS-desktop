/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Connection, Model } from 'mongoose';
import { IUserConfigDAO, UserConfig, UserConfigInfo } from '../interfaces/IUserConfigDAO';
import { UserConfigDocument } from './MongoDBSchemas';
import { getLogger } from '../../utils/logger';

const logger = getLogger('UserConfigDAO');

/**
 * MongoDB implementation of IUserConfigDAO
 */
export class UserConfigDAO implements IUserConfigDAO {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private getUserConfigModel(): Model<UserConfigDocument> {
    return this.connection.model<UserConfigDocument>('UserConfig');
  }

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
      logger.error('Failed to get user config:', error);
      throw new Error('Failed to retrieve user configuration');
    }
  }

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
      logger.error('Failed to create user config:', error);
      if ((error as any).code === 11000) {
        throw new Error('User configuration already exists');
      }
      throw new Error('Failed to create user configuration');
    }
  }

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
      logger.error('Failed to update user config:', error);
      throw new Error('Failed to update user configuration');
    }
  }

  async getOrCreateUserConfig(userId: string): Promise<UserConfigInfo> {
    let userConfig = await this.getUserConfig(userId);

    if (!userConfig) {
      userConfig = await this.createUserConfig(userId);
    }

    return userConfig;
  }

  async deleteUserConfig(userId: string): Promise<boolean> {
    try {
      const UserConfigModel = this.getUserConfigModel();
      const result = await UserConfigModel.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Failed to delete user config:', error);
      throw new Error('Failed to delete user configuration');
    }
  }

  async getSandboxAllocationStrategy(
    userId: string,
  ): Promise<'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive'> {
    const config = await this.getOrCreateUserConfig(userId);
    return config.config.sandboxAllocationStrategy;
  }

  async getSandboxPoolQuota(userId: string): Promise<number> {
    const config = await this.getOrCreateUserConfig(userId);
    return config.config.sandboxPoolQuota;
  }

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

  async removeSharedLink(userId: string, sharedLink: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedLinks = userConfig.config.sharedLinks.filter((link) => link !== sharedLink);
    return this.updateUserConfig(userId, { sharedLinks: updatedLinks });
  }

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

  async removeCustomSpFragment(userId: string, fragment: string): Promise<UserConfigInfo | null> {
    const userConfig = await this.getUserConfig(userId);
    if (!userConfig) {
      return null;
    }

    const updatedFragments = userConfig.config.customSpFragments.filter((f) => f !== fragment);
    return this.updateUserConfig(userId, { customSpFragments: updatedFragments });
  }

  async updateModelProviders(
    userId: string,
    providers: UserConfig['modelProviders'],
  ): Promise<UserConfigInfo | null> {
    return this.updateUserConfig(userId, { modelProviders: providers });
  }
}