/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger } from '@tarko/mcp-agent';
import { BrowserControlStrategy } from './base-strategy';
import { BrowserHybridStrategy } from './browser-hybrid-strategy';
import { BrowserVisualGroundingStrategy } from './browser-visual-grounding-strategy';
import { BrowserDOMStrategy } from './browser-dom-strategy';
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
      case 'hybrid':
        return new BrowserHybridStrategy(logger);
      case 'visual-grounding':
        return new BrowserVisualGroundingStrategy(logger);
      case 'dom':
        return new BrowserDOMStrategy(logger);
      default:
        logger.warn(`Unknown browser control mode: ${mode}, falling back to default`);
        return new BrowserHybridStrategy(logger);
    }
  }
}
