/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import { IUserConfigDAO, UserConfig, UserConfigInfo } from '../interfaces/IUserConfigDAO';

// Row types for SQLite results
interface UserConfigRow {
  userId: string;
  createdAt: number;
  updatedAt: number;
  config: string; // JSON string
}

/**
 * SQLite implementation of IUserConfigDAO
 */
export class UserConfigDAO implements IUserConfigDAO {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async getUserConfig(userId: string): Promise<UserConfigInfo | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT userId, createdAt, updatedAt, config
        FROM user_configs
        WHERE userId = ?
      `);

      const row = stmt.get(userId) as UserConfigRow | undefined;
      if (!row) {
        return null;
      }

      return {
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        config: JSON.parse(row.config),
      };
    } catch (error) {
      console.error('Failed to get user config:', error);
      throw new Error('Failed to retrieve user configuration');
    }
  }

  async createUserConfig(userId: string, config?: Partial<UserConfig>): Promise<UserConfigInfo> {
    try {
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

      const stmt = this.db.prepare(`
        INSERT INTO user_configs (userId, createdAt, updatedAt, config)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(userId, now, now, JSON.stringify(finalConfig));

      return {
        userId,
        createdAt: now,
        updatedAt: now,
        config: finalConfig,
      };
    } catch (error) {
      console.error('Failed to create user config:', error);
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
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
      // First get the current config
      const currentConfig = await this.getUserConfig(userId);
      if (!currentConfig) {
        return null;
      }

      // Merge the updates
      const updatedConfig = {
        ...currentConfig.config,
        ...configUpdates,
      };

      const now = Date.now();

      const stmt = this.db.prepare(`
        UPDATE user_configs
        SET updatedAt = ?, config = ?
        WHERE userId = ?
      `);

      const result = stmt.run(now, JSON.stringify(updatedConfig), userId);

      if (result.changes === 0) {
        return null;
      }

      return {
        userId,
        createdAt: currentConfig.createdAt,
        updatedAt: now,
        config: updatedConfig,
      };
    } catch (error) {
      console.error('Failed to update user config:', error);
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
      const stmt = this.db.prepare('DELETE FROM user_configs WHERE userId = ?');
      const result = stmt.run(userId);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete user config:', error);
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