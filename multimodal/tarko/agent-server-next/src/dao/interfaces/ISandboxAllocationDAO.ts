/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SandboxAllocation {
  sandboxId: string;
  sandboxUrl: string;
  userId?: string;
  sessionId?: string;
  allocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}

/**
 * Sandbox Allocation Data Access Object interface
 * Provides abstraction for sandbox allocation data operations
 */
export interface ISandboxAllocationDAO {
  /**
   * Create a new sandbox allocation
   */
  createSandboxAllocation(allocation: Omit<SandboxAllocation, 'createdAt' | 'lastUsedAt'>): Promise<SandboxAllocation>;

  /**
   * Get sandbox allocation by sandbox ID
   */
  getSandboxAllocation(sandboxId: string): Promise<SandboxAllocation | null>;

  /**
   * Get all active sandbox allocations for a user
   */
  getUserSandboxAllocations(userId: string): Promise<SandboxAllocation[]>;

  /**
   * Get sandbox allocation for a specific session
   */
  getSessionSandboxAllocation(sessionId: string): Promise<SandboxAllocation | null>;

  /**
   * Get available sandbox allocations by strategy
   */
  getAvailableSandboxAllocations(
    strategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive',
    userId?: string,
  ): Promise<SandboxAllocation[]>;

  /**
   * Update sandbox allocation last used time
   */
  updateSandboxLastUsed(sandboxId: string): Promise<void>;

  /**
   * Mark sandbox allocation as inactive
   */
  deactivateSandboxAllocation(sandboxId: string): Promise<boolean>;

  /**
   * Mark sandbox allocation as active
   */
  activateSandboxAllocation(sandboxId: string): Promise<boolean>;

  /**
   * Delete sandbox allocation
   */
  deleteSandboxAllocation(sandboxId: string): Promise<boolean>;

  /**
   * Get sandbox allocations that haven't been used since the specified time
   */
  getUnusedSandboxAllocations(sinceTime: number): Promise<SandboxAllocation[]>;

  /**
   * Get all inactive sandbox allocations
   */
  getInactiveSandboxAllocations(): Promise<SandboxAllocation[]>;

  /**
   * Update sandbox allocation metadata
   */
  updateSandboxAllocation(
    sandboxId: string,
    updates: Partial<Pick<SandboxAllocation, 'sandboxUrl' | 'userId' | 'sessionId' | 'allocationStrategy' | 'isActive'>>,
  ): Promise<SandboxAllocation | null>;
}