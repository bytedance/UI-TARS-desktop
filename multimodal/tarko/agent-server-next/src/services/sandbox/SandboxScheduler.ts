/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SandboxManager } from './SandboxManager';
import { StorageProvider } from '../../storage/types';
import type { SandboxAllocationStrategy, SandboxAllocation } from './types';
import { ISandboxAllocationDAO } from '../../dao/interfaces/ISandboxAllocationDAO';
import { SandboxConfig } from '@tarko/interface';
import { getLogger } from '../../utils/logger';
import { ILogger } from '../../types';

export interface SandboxSchedulerOptions {
  sandboxConfig: SandboxConfig;
  storageProvider: StorageProvider;
}

/**
 * SandboxScheduler - Intelligent sandbox allocation based on user configuration
 * Handles different allocation strategies and quota management
 */
export class SandboxScheduler {
  private sandboxManager: SandboxManager;
  private sandboxAllocationDAO: ISandboxAllocationDAO;
  private storageProvider: StorageProvider;
  private logger: ILogger;

  constructor(options: SandboxSchedulerOptions) {
    this.sandboxManager = new SandboxManager(options.sandboxConfig);
    this.storageProvider = options.storageProvider;
    this.sandboxAllocationDAO = options.storageProvider.getDAOFactory().getSandboxAllocationDAO();
    this.logger = getLogger('SandboxScheduler');
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
      let allocation: SandboxAllocation | null = null;

      switch (strategy) {
        case 'Shared-Pool':
          // For shared pool, find any active shared sandbox
          const sharedAllocations = await this.sandboxAllocationDAO.getAvailableSandboxAllocations('Shared-Pool');
          allocation = sharedAllocations.length > 0 ? sharedAllocations[0] : null;
          break;

        case 'User-Exclusive':
          if (!userId) return null;
          // Find user's exclusive sandbox
          const userAllocations = await this.sandboxAllocationDAO.getUserSandboxAllocations(userId);
          allocation = userAllocations.find(a => a.allocationStrategy === 'User-Exclusive') || null;
          break;

        case 'Session-Exclusive':
          if (!sessionId) return null;
          // Find session's exclusive sandbox
          allocation = await this.sandboxAllocationDAO.getSessionSandboxAllocation(sessionId);
          break;
      }

      if (allocation) {
        // Verify sandbox still exists
        const exists = this.checkInstanceExist(allocation.sandboxUrl);
        if (!exists) {
          // Mark as inactive and return null to create new one
          await this.sandboxAllocationDAO.deactivateSandboxAllocation(allocation.sandboxId);
          return null;
        }

        return allocation;
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
      
      const instance = await this.sandboxManager.createInstance({
        userId,
        sessionId,
        allocationStrategy: strategy,
      });

      const allocation = await this.sandboxAllocationDAO.createSandboxAllocation({
        sandboxId: instance.id,
        sandboxUrl: instance.url,
        userId,
        sessionId,
        allocationStrategy: strategy,
        isActive: true,
      });

      this.logger.info('New sandbox created and allocated', {
        sandboxId: instance.id,
        strategy,
        userId,
        sessionId,
      });

      return allocation;

    } catch (error) {
      this.logger.error('Failed to create new sandbox:', error);
      throw error;
    }
  }


  /**
   * Release a sandbox (mark as inactive)
   */
  async releaseSandbox(sandboxId: string): Promise<void> {
    try {
      // Mark allocation as inactive
      await this.sandboxAllocationDAO.deactivateSandboxAllocation(sandboxId);

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
      return await this.sandboxAllocationDAO.getUserSandboxAllocations(userId);
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
      const inactiveAllocations = await this.sandboxAllocationDAO.getInactiveSandboxAllocations();

      for (const allocation of inactiveAllocations) {
        try {
          // Try to delete the actual sandbox instance
          await this.sandboxManager.deleteInstance(allocation.sandboxId);

          // Remove from database
          await this.sandboxAllocationDAO.deleteSandboxAllocation(allocation.sandboxId);

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
