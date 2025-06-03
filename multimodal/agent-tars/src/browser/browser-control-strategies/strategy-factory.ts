/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger } from '@multimodal/mcp-agent';
import { BrowserControlStrategy } from './base-strategy';
import { MixedControlStrategy } from './mixed-strategy';
import { GUIAgentOnlyStrategy } from './gui-agent-only-strategy';
import { BrowserUseOnlyStrategy } from './browser-use-only-strategy';
import { BrowserControlMode } from '../../types';

/**
 * StrategyFactory - Factory for creating browser control strategies
 *
 * Responsible for instantiating the appropriate strategy based on the requested mode
 */
export class StrategyFactory {
  /**
   * Create a browser control strategy based on the specified mode
   * @param mode Browser control mode
   * @param logger Logger instance
   * @returns Browser control strategy instance
   */
  static createStrategy(mode: BrowserControlMode, logger: ConsoleLogger): BrowserControlStrategy {
    switch (mode) {
      case 'mixed':
        return new MixedControlStrategy(logger);
      case 'gui-agent-only':
        return new GUIAgentOnlyStrategy(logger);
      case 'browser-use-only':
        return new BrowserUseOnlyStrategy(logger);
      default:
        logger.warn(`Unknown browser control mode: ${mode}, falling back to default`);
        return new MixedControlStrategy(logger);
    }
  }
}
