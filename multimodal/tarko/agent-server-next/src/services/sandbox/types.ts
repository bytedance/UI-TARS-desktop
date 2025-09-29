/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export type SandboxAllocationStrategy = 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';

export interface SandboxInstance {
  id: string;
  url: string;
  createdAt: number;
  lastUsedAt: number;
  ttlMinutes: number;
  isActive: boolean;
}

export interface SandboxAllocation {
  sandboxId: string;
  sandboxUrl: string;
  userId?: string;
  sessionId?: string;
  allocationStrategy: SandboxAllocationStrategy;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}

export interface CreateSandboxOptions {
  ttlMinutes?: number;
  userId?: string;
  sessionId?: string;
  allocationStrategy?: SandboxAllocationStrategy;
}

export interface SandboxDeleteResult {
  success: boolean;
  shouldContinue: boolean;
  error?: string;
}

export interface SandboxImageInfo {
  info?: {
    version: string;
  };
}
