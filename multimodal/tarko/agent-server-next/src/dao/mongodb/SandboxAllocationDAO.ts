/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Connection, Model } from 'mongoose';
import { ISandboxAllocationDAO, SandboxAllocation } from '../interfaces/ISandboxAllocationDAO';
import { SandboxAllocationDocument } from './MongoDBSchemas';
import { getLogger } from '../../utils/logger';
import { ILogger } from '../../types';

/**
 * MongoDB implementation of ISandboxAllocationDAO
 */
export class SandboxAllocationDAO implements ISandboxAllocationDAO {
  private connection: Connection;
  private logger: ILogger

  constructor(connection: Connection) {
    this.connection = connection;
    this.logger = getLogger('SandboxAllocationDAO');
  }

  private getSandboxAllocationModel(): Model<SandboxAllocationDocument> {
    return this.connection.model<SandboxAllocationDocument>('SandboxAllocation');
  }

  async createSandboxAllocation(
    allocation: Omit<SandboxAllocation, 'createdAt' | 'lastUsedAt'>,
  ): Promise<SandboxAllocation> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const now = Date.now();

      const sandboxAllocation = new SandboxAllocationModel({
        ...allocation,
        createdAt: now,
        lastUsedAt: now,
      });

      const saved = await sandboxAllocation.save();

      this.logger.info(`Sandbox allocation created: ${allocation.sandboxId}`);

      return {
        sandboxId: saved.sandboxId,
        sandboxUrl: saved.sandboxUrl,
        userId: saved.userId,
        sessionId: saved.sessionId,
        allocationStrategy: saved.allocationStrategy,
        createdAt: saved.createdAt,
        lastUsedAt: saved.lastUsedAt,
        isActive: saved.isActive,
      };
    } catch (error) {
      this.logger.error(`Failed to create sandbox allocation ${allocation.sandboxId}:`, error);
      if ((error as any).code === 11000) {
        throw new Error(`Sandbox allocation with ID ${allocation.sandboxId} already exists`);
      }
      throw new Error('Failed to create sandbox allocation');
    }
  }

  async getSandboxAllocation(sandboxId: string): Promise<SandboxAllocation | null> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const allocation = await SandboxAllocationModel.findOne({ sandboxId }).lean();

      if (!allocation) {
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
    } catch (error) {
      this.logger.error(`Failed to get sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to get sandbox allocation');
    }
  }

  async getUserSandboxAllocations(userId: string): Promise<SandboxAllocation[]> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const allocations = await SandboxAllocationModel.find({
        userId,
        isActive: true,
      }).lean();

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
      this.logger.error(`Failed to get user sandbox allocations for ${userId}:`, error);
      throw new Error('Failed to get user sandbox allocations');
    }
  }

  async getSessionSandboxAllocation(sessionId: string): Promise<SandboxAllocation | null> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const allocation = await SandboxAllocationModel.findOne({
        sessionId,
        isActive: true,
      }).lean();

      if (!allocation) {
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
    } catch (error) {
      this.logger.error(`Failed to get session sandbox allocation for ${sessionId}:`, error);
      throw new Error('Failed to get session sandbox allocation');
    }
  }

  async getAvailableSandboxAllocations(
    strategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive',
    userId?: string,
  ): Promise<SandboxAllocation[]> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      
      let query: any = {
        allocationStrategy: strategy,
        isActive: true,
      };

      // For user-exclusive strategy, filter by userId if provided
      if (strategy === 'User-Exclusive' && userId) {
        query.userId = userId;
      }

      // For shared pool, we might want to exclude user-specific allocations
      if (strategy === 'Shared-Pool') {
        query.$or = [
          { userId: { $exists: false } },
          { userId: null },
          { userId: userId } // Include user's own shared allocations
        ];
      }

      const allocations = await SandboxAllocationModel.find(query).lean();

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
      this.logger.error(`Failed to get available sandbox allocations for strategy ${strategy}:`, error);
      throw new Error('Failed to get available sandbox allocations');
    }
  }

  async updateSandboxLastUsed(sandboxId: string): Promise<void> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();
      const now = Date.now();

      await SandboxAllocationModel.findOneAndUpdate(
        { sandboxId },
        { lastUsedAt: now },
      );

      this.logger.info(`Sandbox last used time updated: ${sandboxId}`);
    } catch (error) {
      this.logger.error(`Failed to update sandbox last used time for ${sandboxId}:`, error);
      throw new Error('Failed to update sandbox last used time');
    }
  }

  async deactivateSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const result = await SandboxAllocationModel.findOneAndUpdate(
        { sandboxId },
        { isActive: false },
        { new: true },
      );

      if (!result) {
        return false;
      }

      this.logger.info(`Sandbox allocation deactivated: ${sandboxId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to deactivate sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to deactivate sandbox allocation');
    }
  }

  async activateSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const result = await SandboxAllocationModel.findOneAndUpdate(
        { sandboxId },
        { isActive: true },
        { new: true },
      );

      if (!result) {
        return false;
      }

      this.logger.info(`Sandbox allocation activated: ${sandboxId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to activate sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to activate sandbox allocation');
    }
  }

  async deleteSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const result = await SandboxAllocationModel.deleteOne({ sandboxId });
      const deleted = result.deletedCount > 0;

      if (deleted) {
        this.logger.info(`Sandbox allocation deleted: ${sandboxId}`);
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to delete sandbox allocation');
    }
  }

  async getUnusedSandboxAllocations(sinceTime: number): Promise<SandboxAllocation[]> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const allocations = await SandboxAllocationModel.find({
        lastUsedAt: { $lt: sinceTime },
        isActive: true,
      }).lean();

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
      this.logger.error(`Failed to get unused sandbox allocations:`, error);
      throw new Error('Failed to get unused sandbox allocations');
    }
  }

  async getInactiveSandboxAllocations(): Promise<SandboxAllocation[]> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const allocations = await SandboxAllocationModel.find({
        isActive: false,
      }).lean();

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
      this.logger.error(`Failed to get inactive sandbox allocations:`, error);
      throw new Error('Failed to get inactive sandbox allocations');
    }
  }

  async updateSandboxAllocation(
    sandboxId: string,
    updates: Partial<Pick<SandboxAllocation, 'sandboxUrl' | 'userId' | 'sessionId' | 'allocationStrategy' | 'isActive'>>,
  ): Promise<SandboxAllocation | null> {
    try {
      const SandboxAllocationModel = this.getSandboxAllocationModel();

      const result = await SandboxAllocationModel.findOneAndUpdate(
        { sandboxId },
        { $set: updates },
        { new: true, lean: true },
      );

      if (!result) {
        return null;
      }

      this.logger.info(`Sandbox allocation updated: ${sandboxId}`);

      return {
        sandboxId: result.sandboxId,
        sandboxUrl: result.sandboxUrl,
        userId: result.userId,
        sessionId: result.sessionId,
        allocationStrategy: result.allocationStrategy,
        createdAt: result.createdAt,
        lastUsedAt: result.lastUsedAt,
        isActive: result.isActive,
      };
    } catch (error) {
      this.logger.error(`Failed to update sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to update sandbox allocation');
    }
  }
}