/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ILogger } from '../../types';
import { getLogger } from '../../utils/logger';
import { AgentSession } from './AgentSession';

export interface SessionPoolConfig {
  maxSessions?: number;
  memoryLimitMB?: number;
  checkIntervalMs?: number;
}

interface SessionEntry {
  session: AgentSession;
  lastAccessed: number;
  createdAt: number;
}

/**
 * LRU Session Pool with memory-based eviction
 * Manages AgentSession instances with automatic cleanup to prevent memory leaks
 */
export class AgentSessionPool {
  private sessions = new Map<string, SessionEntry>();
  private readonly maxSessions: number;
  private readonly memoryLimitMB: number;
  private readonly checkIntervalMs: number;
  private memoryCheckTimer?: NodeJS.Timeout;
  private logger: ILogger;

  constructor(config?: SessionPoolConfig) {
    this.maxSessions = config?.maxSessions ?? 200;
    this.memoryLimitMB = config?.memoryLimitMB ?? 512;
    this.checkIntervalMs = config?.checkIntervalMs ?? 30000; // 30 seconds
    this.logger = getLogger('AgentSessionPool');
    // Start periodic memory check
    this.startMemoryMonitoring();
  }

  /**
   * Add a session to the pool
   */
  set(sessionId: string, session: AgentSession): void {
    const now = Date.now();

    // If session already exists, update access time
    if (this.sessions.has(sessionId)) {
      const entry = this.sessions.get(sessionId)!;
      entry.lastAccessed = now;
      return;
    }

    this.sessions.set(sessionId, {
      session,
      lastAccessed: now,
      createdAt: now,
    });

    // Check if we need to evict sessions
    this.evictIfNeeded();
  }

  /**
   * Get a session and update its access time
   */
  get(sessionId: string): AgentSession | undefined {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.session;
    }
    return undefined;
  }

  /**
   * Check if a session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Remove a session from the pool
   */
  async delete(sessionId: string): Promise<boolean> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      await this.cleanupSession(entry.session);
      return this.sessions.delete(sessionId);
    }
    return false;
  }

  /**
   * Get all session IDs
   */
  keys(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get all sessions as a Record (for backward compatibility)
   */
  getAllSessions(): Record<string, AgentSession> {
    const result: Record<string, AgentSession> = {};
    for (const [sessionId, entry] of this.sessions) {
      result[sessionId] = entry.session;
    }
    return result;
  }

  /**
   * Get session count
   */
  size(): number {
    return this.sessions.size;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    sessions: number;
    estimatedMemoryMB: number;
    memoryLimitMB: number;
    memoryUsagePercent: number;
  } {
    const estimatedMemoryMB = this.getEstimatedMemoryUsage();
    return {
      sessions: this.sessions.size,
      estimatedMemoryMB,
      memoryLimitMB: this.memoryLimitMB,
      memoryUsagePercent: (estimatedMemoryMB / this.memoryLimitMB) * 100,
    };
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      this.evictIfNeeded();
    }, this.checkIntervalMs);
  }

  /**
   * Stop memory monitoring
   */
  async stopMemoryMonitoring(): Promise<void> {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = undefined;
    }
  }

  /**
   * Evict sessions if needed based on memory usage or session count
   */
  private async evictIfNeeded(): Promise<void> {
    const estimatedMemory = this.getEstimatedMemoryUsage();
    const memoryThreshold = this.memoryLimitMB * 0.8; // 80% of limit

    // Check memory usage or session count limits
    if (estimatedMemory > memoryThreshold || this.sessions.size > this.maxSessions) {
      const targetEvictions = Math.max(
        Math.ceil(this.sessions.size * 0.1), // Evict at least 10%
        this.sessions.size > this.maxSessions ? this.sessions.size - this.maxSessions : 0,
      );

      this.logger.warn(
        'detect memory reaching limit, cur stats: ',
        JSON.stringify(
          {
            estimatedMemory,
            memoryThreshold,
            sessionSize: this.sessions.size,
            maxSessions: this.maxSessions,
          },
          null,
          2,
        ),
      );

      await this.evictOldestSessions(targetEvictions);
    }
  }

  /**
   * Evict the oldest (least recently used) sessions
   */
  private async evictOldestSessions(count: number): Promise<void> {
    // Sort sessions by last accessed time (oldest first)
    const sortedEntries = Array.from(this.sessions.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    const toEvict = sortedEntries.slice(0, count);

    for (const [sessionId, entry] of toEvict) {
      try {
        await this.cleanupSession(entry.session);
        this.sessions.delete(sessionId);
        this.logger.info(`[SessionPool] Evicted session ${sessionId} (LRU)`);
      } catch (error) {
        this.logger.error(`[SessionPool] Failed to evict session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Estimate memory usage based on session count
   */
  private getEstimatedMemoryUsage(): number {
    // FIXME: Rough estimate: ~3MB per session (should be tuned based on actual usage)
    return this.sessions.size * 3;
  }

  /**
   * Clean up a session properly
   */
  private async cleanupSession(session: AgentSession): Promise<void> {
    try {
      await session.cleanup();
    } catch (error) {
      this.logger.error('Failed to cleanup session:', error);
    }
  }

  /**
   * Clean up all sessions and stop monitoring
   */
  async cleanup(): Promise<void> {
    await this.stopMemoryMonitoring();

    const cleanupPromises = Array.from(this.sessions.values()).map((entry) =>
      this.cleanupSession(entry.session),
    );

    await Promise.all(cleanupPromises);
    this.sessions.clear();
  }
}
