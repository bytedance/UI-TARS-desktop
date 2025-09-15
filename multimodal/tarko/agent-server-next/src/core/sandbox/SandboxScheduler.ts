/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SandboxManager } from './SandboxManager';
import { UserConfigService } from '../../services/UserConfigService';
import { SandboxAllocationDocument } from '../../storage/MongoDBStorageProvider/MongoDBSchemas';
import { MongoDBStorageProvider } from '../../storage/MongoDBStorageProvider/MongoDBStorageProvider';
import type { SandboxAllocationStrategy, SandboxAllocation } from './types';
import { SandboxConfig } from '@tarko/interface';
import { ConsoleLogger, getLogger } from '@tarko/shared-utils';
import { Model } from 'mongoose';

export interface SandboxSchedulerOptions {
  sandboxConfig: SandboxConfig;
  userConfigService: UserConfigService;
  storageProvider: MongoDBStorageProvider;
}

/**
 * SandboxScheduler - Intelligent sandbox allocation based on user configuration
 * Handles different allocation strategies and quota management
 */
export class SandboxScheduler {
  private sandboxManager: SandboxManager;
  private userConfigService: UserConfigService;
  private storageProvider: MongoDBStorageProvider;
  private logger: ConsoleLogger;

  constructor(options: SandboxSchedulerOptions) {
    this.sandboxManager = new SandboxManager(options.sandboxConfig);
    this.userConfigService = options.userConfigService;
    this.storageProvider = options.storageProvider;
    this.logger = getLogger('SandboxScheduler');
  }

  private getSandboxAllocationModel(): Model<SandboxAllocationDocument> {
    return this.storageProvider.getSandboxAllocationModel();
  }

  /**
   * Get or create a sandbox URL for a user/session based on allocation strategy
   */
  async getSandboxUrl(options: {
    userId?: string;
    sessionId?: string;
    strategy?: SandboxAllocationStrategy;
  }): Promise<string> {
    const { userId, sessionId } = options;

    let strategy = options.strategy;
    //TODO: Here is a temporary comment, do not query the user's strategy from db, and use session exclusively
    // if (!strategy && userId) {
    //   strategy = await this.userConfigService.getSandboxAllocationStrategy(userId);
    // }
    strategy = strategy || 'Session-Exclusive';

    this.logger.info('Getting sandbox URL', { userId, sessionId, strategy });

    // Try to find existing sandbox first
    const existingSandbox = await this.findExistingSandbox({ userId, sessionId, strategy });
    if (existingSandbox) {
      // Update last used time
      this.logger.info('use existing sandbox: ', existingSandbox.sandboxId);
      await this.updateSandboxLastUsed(existingSandbox.sandboxId);
      return existingSandbox.sandboxUrl;
    }

    // TODO:session exclusive mode: limits the total amount of sandbox users can apply for. This place also needs to be modified with the previous findExistingSandbox. It is divided into several situations.
    // 1. If quota is not exceeded, a new sandbox will be created first.
    // 2. Has exceeded quota, select an idle sandbox
    // 3. If there is no idle sandbox, remind users to queue up sandbox
    // if (strategy === 'Session-Exclusive' && userId) {
    //   await this.handleSessionExclusiveQuota(userId);
    // }

    // Create new sandbox
    const sandbox = await this.createNewSandbox({ userId, sessionId, strategy });

    this.logger.info('create new sandbox: ', sandbox.sandboxId);
    return sandbox.sandboxUrl;
  }

  /**
   * Find existing sandbox based on allocation strategy
   */
  private async findExistingSandbox(options: {
    userId?: string;
    sessionId?: string;
    strategy: SandboxAllocationStrategy;
  }): Promise<SandboxAllocation | null> {
    const { userId, sessionId, strategy } = options;

    try {
      let query: any = {
        allocationStrategy: strategy,
        isActive: true,
      };

      switch (strategy) {
        case 'Shared-Pool':
          // For shared pool, find any active shared sandbox
          query.allocationStrategy = 'Shared-Pool';
          break;

        case 'User-Exclusive':
          if (!userId) return null;
          // Find user's exclusive sandbox
          query.userId = userId;
          break;

        case 'Session-Exclusive':
          if (!sessionId) return null;
          // Find session's exclusive sandbox
          query.sessionId = sessionId;
          break;
      }

      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const allocation = await SandboxAllocationModel.findOne(query)
        .sort({ lastUsedAt: -1 })
        .lean();

      if (allocation) {
        // Verify sandbox still exists
        const exists = this.checkInstanceExist(allocation.sandboxUrl);
        if (!exists) {
          // Mark as inactive and return null to create new one
          await SandboxAllocationModel.updateOne({ _id: allocation._id }, { isActive: false });
          return null;
        }

        return {
          sandboxId: allocation.sandboxId,
          sandboxUrl: allocation.sandboxUrl,
          userId: allocation.userId,
          sessionId: allocation.sessionId,
          allocationStrategy: allocation.allocationStrategy,
          createdAt: allocation.createdAt,
          lastUsedAt: allocation.lastUsedAt,
          isActive: allocation.isActive,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find existing sandbox:', error);
      return null;
    }
  }

  /**
   * if sandboxId is null or health check failed , then return false
   */
  async checkInstanceExist(sandboxURL: string | undefined) {
    if (!sandboxURL) {
      return false;
    }
    try {
      return !(await this.sandboxManager.checkInstanceNotExist(sandboxURL));
    } catch (e) {
      this.logger.error('Failed to check sandbox instance status: ', e);
      return false;
    }
  }

  /**
   * Create a new sandbox and record allocation
   */
  private async createNewSandbox(options: {
    userId?: string;
    sessionId?: string;
    strategy: SandboxAllocationStrategy;
  }): Promise<SandboxAllocation> {
    const { userId, sessionId, strategy } = options;

    try {
      // Create sandbox instance
      const instance = await this.sandboxManager.createInstance({
        userId,
        sessionId,
        allocationStrategy: strategy,
      });

      // Check if sandbox allocation already exists (handle race conditions)
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const existingAllocation = await SandboxAllocationModel.findOne({
        sandboxId: instance.id,
      }).lean();

      if (existingAllocation) {
        this.logger.info('Sandbox allocation already exists, returning existing', {
          sandboxId: instance.id,
          strategy,
          userId,
          sessionId,
        });

        return {
          sandboxId: existingAllocation.sandboxId,
          sandboxUrl: existingAllocation.sandboxUrl,
          userId: existingAllocation.userId,
          sessionId: existingAllocation.sessionId,
          allocationStrategy: existingAllocation.allocationStrategy,
          createdAt: existingAllocation.createdAt,
          lastUsedAt: existingAllocation.lastUsedAt,
          isActive: existingAllocation.isActive,
        };
      }

      // Record allocation in database
      const allocation = new SandboxAllocationModel({
        sandboxId: instance.id,
        sandboxUrl: instance.url,
        userId,
        sessionId,
        allocationStrategy: strategy,
        createdAt: instance.createdAt,
        lastUsedAt: instance.lastUsedAt,
        isActive: true,
      });

      try {
        await allocation.save();
      } catch (saveError: any) {
        // Handle duplicate key error (race condition)
        if (saveError.code === 11000) {
          this.logger.info('Duplicate key error caught, fetching existing allocation', {
            sandboxId: instance.id,
            error: saveError.message,
          });

          const existingAllocation = await SandboxAllocationModel.findOne({
            sandboxId: instance.id,
          }).lean();

          if (existingAllocation) {
            return {
              sandboxId: existingAllocation.sandboxId,
              sandboxUrl: existingAllocation.sandboxUrl,
              userId: existingAllocation.userId,
              sessionId: existingAllocation.sessionId,
              allocationStrategy: existingAllocation.allocationStrategy,
              createdAt: existingAllocation.createdAt,
              lastUsedAt: existingAllocation.lastUsedAt,
              isActive: existingAllocation.isActive,
            };
          }
        }
        throw saveError;
      }

      this.logger.info('New sandbox created and allocated', {
        sandboxId: instance.id,
        strategy,
        userId,
        sessionId,
      });

      return {
        sandboxId: instance.id,
        sandboxUrl: instance.url,
        userId,
        sessionId,
        allocationStrategy: strategy,
        createdAt: instance.createdAt,
        lastUsedAt: instance.lastUsedAt,
        isActive: true,
      };
    } catch (error) {
      this.logger.error('Failed to create new sandbox:', error);
      throw error;
    }
  }

  /**
   * Handle Session-Exclusive quota management
   */
  private async handleSessionExclusiveQuota(userId: string): Promise<void> {
    try {
      const quota = await this.userConfigService.getSandboxPoolQuota(userId);

      // Count active session-exclusive sandboxes for user
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const activeCount = await SandboxAllocationModel.countDocuments({
        userId,
        allocationStrategy: 'Session-Exclusive',
        isActive: true,
      });

      if (activeCount >= quota) {
        // Find oldest sandbox to reuse
        const oldestSandbox = await SandboxAllocationModel.findOne({
          userId,
          allocationStrategy: 'Session-Exclusive',
          isActive: true,
        }).sort({ lastUsedAt: 1 });

        if (oldestSandbox) {
          this.logger.info('Quota exceeded, will reuse oldest sandbox', {
            userId,
            quota,
            activeCount,
            oldestSandboxId: oldestSandbox.sandboxId,
          });

          // Note: The oldest sandbox will be naturally reused in the next allocation
          // if the findExistingSandbox logic is updated to handle quota reuse
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle session exclusive quota:', error);
      // Don't throw, just log and continue
    }
  }

  /**
   * Update sandbox last used time
   */
  private async updateSandboxLastUsed(sandboxId: string): Promise<void> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      await SandboxAllocationModel.updateOne(
        { sandboxId, isActive: true },
        { lastUsedAt: Date.now() },
      );
    } catch (error) {
      this.logger.error('Failed to update sandbox last used time:', error);
    }
  }

  /**
   * Release a sandbox (mark as inactive)
   */
  async releaseSandbox(sandboxId: string): Promise<void> {
    try {
      // Mark allocation as inactive
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      await SandboxAllocationModel.updateOne({ sandboxId }, { isActive: false });

      // Delete the actual sandbox instance
      const result = await this.sandboxManager.deleteInstance(sandboxId);

      this.logger.info('Sandbox released', {
        sandboxId,
        deleteResult: result,
      });
    } catch (error) {
      this.logger.error('Failed to release sandbox:', error);
      throw error;
    }
  }

  /**
   * Get sandbox allocations for a user
   */
  async getUserSandboxes(userId: string): Promise<SandboxAllocation[]> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const allocations = await SandboxAllocationModel.find({
        userId,
        isActive: true,
      })
        .sort({ lastUsedAt: -1 })
        .lean();

      return allocations.map((allocation) => ({
        sandboxId: allocation.sandboxId,
        sandboxUrl: allocation.sandboxUrl,
        userId: allocation.userId,
        sessionId: allocation.sessionId,
        allocationStrategy: allocation.allocationStrategy,
        createdAt: allocation.createdAt,
        lastUsedAt: allocation.lastUsedAt,
        isActive: allocation.isActive,
      }));
    } catch (error) {
      this.logger.error('Failed to get user sandboxes:', error);
      return [];
    }
  }

  /**
   * Clean up inactive sandboxes
   */
  async cleanupInactiveSandboxes(): Promise<void> {
    try {
      // Find sandboxes marked as inactive
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const inactiveAllocations = await SandboxAllocationModel.find({
        isActive: false,
      }).lean();

      for (const allocation of inactiveAllocations) {
        try {
          // Try to delete the actual sandbox instance
          await this.sandboxManager.deleteInstance(allocation.sandboxId);

          // Remove from database
          await SandboxAllocationModel.deleteOne({ _id: allocation._id });

          this.logger.info('Cleaned up inactive sandbox', {
            sandboxId: allocation.sandboxId,
          });
        } catch (error) {
          this.logger.error('Failed to cleanup sandbox:', error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive sandboxes:', error);
    }
  }

  /**
   * Get sandbox manager instance
   */
  getSandboxManager(): SandboxManager {
    return this.sandboxManager;
  }
}
