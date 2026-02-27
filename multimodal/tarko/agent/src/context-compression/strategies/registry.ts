/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextCompressionStrategy } from '../types';
import { SlidingWindowStrategy } from './sliding-window';
import { StructuredSummaryStrategy } from './structured-summary';
import { ToolResponseCompressionStrategy } from './tool-response-compression';
import { SmartTruncationStrategy } from './smart-truncation';
import { getLogger } from '@tarko/shared-utils';

/**
 * Registry for context compression strategies
 * 
 * This registry allows for easy registration and retrieval of compression strategies,
 * supporting both built-in strategies and custom user-defined strategies.
 */
export class CompressionStrategyRegistry {
  private static instance: CompressionStrategyRegistry;
  private strategies = new Map<string, ContextCompressionStrategy>();
  private logger = getLogger('CompressionStrategyRegistry');
  
  private constructor() {
    this.registerBuiltInStrategies();
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): CompressionStrategyRegistry {
    if (!CompressionStrategyRegistry.instance) {
      CompressionStrategyRegistry.instance = new CompressionStrategyRegistry();
    }
    return CompressionStrategyRegistry.instance;
  }
  
  /**
   * Register built-in compression strategies
   */
  private registerBuiltInStrategies(): void {
    this.register(new SlidingWindowStrategy());
    this.register(new StructuredSummaryStrategy());
    this.register(new ToolResponseCompressionStrategy());
    this.register(new SmartTruncationStrategy());
    
    this.logger.info(`Registered ${this.strategies.size} built-in compression strategies`);
  }
  
  /**
   * Register a compression strategy
   * @param strategy The strategy to register
   */
  register(strategy: ContextCompressionStrategy): void {
    if (this.strategies.has(strategy.name)) {
      this.logger.warn(`Overriding existing strategy: ${strategy.name}`);
    }
    
    this.strategies.set(strategy.name, strategy);
    this.logger.debug(`Registered compression strategy: ${strategy.name}`);
  }
  
  /**
   * Get a compression strategy by name
   * @param name The name of the strategy
   * @returns The strategy instance or undefined if not found
   */
  get(name: string): ContextCompressionStrategy | undefined {
    return this.strategies.get(name);
  }
  
  /**
   * Get a compression strategy by name, throwing if not found
   * @param name The name of the strategy
   * @returns The strategy instance
   * @throws Error if strategy is not found
   */
  getRequired(name: string): ContextCompressionStrategy {
    const strategy = this.get(name);
    if (!strategy) {
      throw new Error(`Compression strategy not found: ${name}. Available strategies: ${this.listNames().join(', ')}`);
    }
    return strategy;
  }
  
  /**
   * Check if a strategy is registered
   * @param name The name of the strategy
   * @returns True if the strategy is registered
   */
  has(name: string): boolean {
    return this.strategies.has(name);
  }
  
  /**
   * Unregister a strategy
   * @param name The name of the strategy to unregister
   * @returns True if the strategy was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    const removed = this.strategies.delete(name);
    if (removed) {
      this.logger.debug(`Unregistered compression strategy: ${name}`);
    }
    return removed;
  }
  
  /**
   * Get all registered strategy names
   * @returns Array of strategy names
   */
  listNames(): string[] {
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Get all registered strategies
   * @returns Array of strategy instances
   */
  listStrategies(): ContextCompressionStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Get strategy information for display
   * @returns Array of strategy info objects
   */
  getStrategyInfo(): Array<{ name: string; description: string }> {
    return this.listStrategies().map(strategy => ({
      name: strategy.name,
      description: strategy.description,
    }));
  }
  
  /**
   * Clear all registered strategies (useful for testing)
   */
  clear(): void {
    this.strategies.clear();
    this.logger.debug('Cleared all compression strategies');
  }
  
  /**
   * Get the default strategy
   * @returns The default sliding window strategy
   */
  getDefault(): ContextCompressionStrategy {
    return this.getRequired('sliding_window');
  }
}

/**
 * Convenience function to get the global registry instance
 */
export function getCompressionStrategyRegistry(): CompressionStrategyRegistry {
  return CompressionStrategyRegistry.getInstance();
}

/**
 * Convenience function to register a custom strategy
 * @param strategy The strategy to register
 */
export function registerCompressionStrategy(strategy: ContextCompressionStrategy): void {
  getCompressionStrategyRegistry().register(strategy);
}

/**
 * Convenience function to get a strategy by name
 * @param name The name of the strategy
 * @returns The strategy instance or undefined if not found
 */
export function getCompressionStrategy(name: string): ContextCompressionStrategy | undefined {
  return getCompressionStrategyRegistry().get(name);
}

/**
 * Get strategy by name or instance
 * @param strategy Strategy name or instance
 * @returns Strategy instance
 */
export function resolveCompressionStrategy(
  strategy: string | ContextCompressionStrategy
): ContextCompressionStrategy {
  if (typeof strategy === 'string') {
    const registry = getCompressionStrategyRegistry();
    const resolvedStrategy = registry.get(strategy);
    if (!resolvedStrategy) {
      // Fall back to default strategy instead of throwing
      const logger = getLogger('CompressionStrategyRegistry');
      logger.warn(`Strategy '${strategy}' not found, falling back to default 'sliding_window' strategy`);
      return registry.getDefault();
    }
    return resolvedStrategy;
  }
  return strategy;
}
