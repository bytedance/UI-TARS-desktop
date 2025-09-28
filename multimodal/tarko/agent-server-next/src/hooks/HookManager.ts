/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLogger } from '../utils/logger';
import type {
  Hook,
  HookRegistrationOptions,
  IHookManager,
  HookEvent,
  HookStats,
} from './types';

const logger = getLogger('HookManager');

/**
 * Hook manager implementation
 * Manages middleware hooks with priority-based execution order
 */
export class HookManager implements IHookManager {
  private hooks = new Map<string, Hook>();
  private stats = new Map<string, HookStats>();
  private events: HookEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events
  
  /**
   * Register a new hook
   */
  register(options: HookRegistrationOptions): void {
    const {
      id,
      name,
      handler,
      priority = 200, // BuiltInPriorities.CUSTOM_DEFAULT
      description,
      metadata,
      replace = false,
    } = options;

    // Check if hook already exists
    if (this.hooks.has(id) && !replace) {
      throw new Error(`Hook with id '${id}' already exists. Use replace: true to override.`);
    }

    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new Error('Hook id must be a non-empty string');
    }
    
    if (!name || typeof name !== 'string') {
      throw new Error('Hook name must be a non-empty string');
    }
    
    if (typeof handler !== 'function') {
      throw new Error('Hook handler must be a function');
    }
    
    if (typeof priority !== 'number' || !Number.isInteger(priority)) {
      throw new Error('Hook priority must be an integer');
    }

    const hook: Hook = {
      id,
      name,
      handler,
      priority,
      description,
      metadata,
    };

    const isReplacing = this.hooks.has(id);
    this.hooks.set(id, hook);

    // Initialize stats if new hook
    if (!this.stats.has(id)) {
      this.stats.set(id, {
        id,
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
      });
    }

    this.addEvent({
      type: 'register',
      hookId: id,
      timestamp: new Date(),
      data: { isReplacing, priority, name },
    });

    logger.info(
      `Hook ${isReplacing ? 'replaced' : 'registered'}: ${name} (id: ${id}, priority: ${priority})`
    );
  }

  /**
   * Unregister a hook by id
   */
  unregister(id: string): boolean {
    const hook = this.hooks.get(id);
    if (!hook) {
      return false;
    }

    this.hooks.delete(id);
    // Keep stats for historical purposes

    this.addEvent({
      type: 'unregister',
      hookId: id,
      timestamp: new Date(),
      data: { name: hook.name },
    });

    logger.info(`Hook unregistered: ${hook.name} (id: ${id})`);
    return true;
  }

  /**
   * Get all hooks sorted by priority (highest first)
   */
  getHooks(): Hook[] {
    return Array.from(this.hooks.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get hook by id
   */
  getHook(id: string): Hook | undefined {
    return this.hooks.get(id);
  }

  /**
   * Check if hook exists
   */
  hasHook(id: string): boolean {
    return this.hooks.has(id);
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    const count = this.hooks.size;
    this.hooks.clear();
    logger.info(`Cleared ${count} hooks`);
  }

  /**
   * Get hooks count
   */
  count(): number {
    return this.hooks.size;
  }

  /**
   * Get hook execution statistics
   */
  getStats(id?: string): HookStats | HookStats[] {
    if (id) {
      const stats = this.stats.get(id);
      if (!stats) {
        throw new Error(`No stats found for hook: ${id}`);
      }
      return stats;
    }
    return Array.from(this.stats.values());
  }

  /**
   * Get recent events
   */
  getEvents(limit = 100): HookEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Record hook execution
   */
  recordExecution(id: string, executionTime: number, error?: Error): void {
    const stats = this.stats.get(id);
    if (!stats) {
      return;
    }

    stats.executions++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.executions;
    stats.lastExecution = new Date();

    if (error) {
      stats.errors++;
    }

    this.addEvent({
      type: 'execute',
      hookId: id,
      timestamp: new Date(),
      data: { executionTime, error: error?.message },
    });
  }

  /**
   * Get hooks summary for debugging
   */
  getSummary(): {
    totalHooks: number;
    hooksByPriority: Array<{ id: string; name: string; priority: number }>;
    executionStats: Array<{ id: string; executions: number; avgTime: number; errors: number }>;
  } {
    const hooks = this.getHooks();
    return {
      totalHooks: hooks.length,
      hooksByPriority: hooks.map(({ id, name, priority }) => ({ id, name, priority })),
      executionStats: Array.from(this.stats.values()).map(({ id, executions, avgTime, errors }) => ({
        id,
        executions,
        avgTime: Math.round(avgTime * 100) / 100,
        errors,
      })),
    };
  }

  /**
   * Validate hook execution order
   */
  validateExecutionOrder(): { isValid: boolean; warnings: string[] } {
    const hooks = this.getHooks();
    const warnings: string[] = [];
    let isValid = true;

    // Check for duplicate priorities
    const priorityMap = new Map<number, string[]>();
    hooks.forEach(hook => {
      const existing = priorityMap.get(hook.priority) || [];
      existing.push(hook.id);
      priorityMap.set(hook.priority, existing);
    });

    priorityMap.forEach((hookIds, priority) => {
      if (hookIds.length > 1) {
        warnings.push(`Multiple hooks with same priority ${priority}: ${hookIds.join(', ')}`);
      }
    });

    // Check for potential ordering issues
    const authHook = hooks.find(h => h.id.includes('auth'));
    const loggingHook = hooks.find(h => h.id.includes('log'));
    
    if (authHook && loggingHook && authHook.priority > loggingHook.priority) {
      warnings.push('Authentication hook has higher priority than logging - sensitive data might be logged');
    }

    return { isValid: warnings.length === 0, warnings };
  }

  /**
   * Add event to history
   */
  private addEvent(event: HookEvent): void {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}