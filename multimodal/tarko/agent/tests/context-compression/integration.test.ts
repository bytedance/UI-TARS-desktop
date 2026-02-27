/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../../src/agent';
import { AgentOptions } from '@tarko/agent-interface';

describe('Context Compression Integration', () => {
  let agent: Agent;

  beforeEach(() => {
    const options: AgentOptions = {
      name: 'TestAgent',
      model: {
        provider: 'openai',
        id: 'gpt-4o',
      },
      context: {
        compression: {
          enabled: true,
          strategy: 'sliding_window',
          compressionThreshold: 0.1, // Very low threshold for testing
          targetCompressionRatio: 0.5,
          minMessagesToKeep: 3,
          maxCompressionAttempts: 5,
        },
      },
      tools: [],
    };

    agent = new Agent(options);
  });

  describe('agent initialization', () => {
    it('should initialize agent with compression configuration', () => {
      expect(agent).toBeDefined();
      expect(agent.name).toBe('TestAgent');
    });

    it('should handle compression configuration in context options', () => {
      const agentWithCompression = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'structured_summary',
            compressionThreshold: 0.8,
          },
        },
      });

      expect(agentWithCompression).toBeDefined();
    });

    it('should work with compression disabled', () => {
      const agentWithoutCompression = new Agent({
        context: {
          compression: {
            enabled: false,
          },
        },
      });

      expect(agentWithoutCompression).toBeDefined();
    });
  });

  describe('compression strategies', () => {
    it('should work with sliding window strategy', () => {
      const agentWithSlidingWindow = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'sliding_window',
            compressionThreshold: 0.7,
          },
        },
      });

      expect(agentWithSlidingWindow).toBeDefined();
    });

    it('should work with structured summary strategy', () => {
      const agentWithStructuredSummary = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'structured_summary',
            compressionThreshold: 0.9,
          },
        },
      });

      expect(agentWithStructuredSummary).toBeDefined();
    });

    it('should work with tool response compression strategy', () => {
      const agentWithToolCompression = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'tool_response_compression',
            compressionThreshold: 0.8,
          },
        },
      });

      expect(agentWithToolCompression).toBeDefined();
    });

    it('should work with smart truncation strategy', () => {
      const agentWithSmartTruncation = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'smart_truncation',
            compressionThreshold: 0.75,
          },
        },
      });

      expect(agentWithSmartTruncation).toBeDefined();
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid strategy gracefully', () => {
      // This should fall back to default strategy and not throw
      expect(() => {
        new Agent({
          context: {
            compression: {
              enabled: true,
              strategy: 'invalid_strategy',
            },
          },
        });
      }).not.toThrow();
    });

    it('should handle edge case configurations', () => {
      const agentWithEdgeCases = new Agent({
        context: {
          compression: {
            enabled: true,
            compressionThreshold: 0, // Very low
            targetCompressionRatio: 1, // Very high
            minMessagesToKeep: 0, // Very low
            maxCompressionAttempts: 1000, // Very high
          },
        },
      });

      expect(agentWithEdgeCases).toBeDefined();
    });
  });

  describe('backward compatibility', () => {
    it('should work without compression configuration', () => {
      const simpleAgent = new Agent({
        name: 'SimpleAgent',
      });

      expect(simpleAgent).toBeDefined();
      expect(simpleAgent.name).toBe('SimpleAgent');
    });

    it('should work with only maxImagesCount configuration', () => {
      const agentWithImages = new Agent({
        context: {
          maxImagesCount: 10,
        },
      });

      expect(agentWithImages).toBeDefined();
    });

    it('should work with partial compression configuration', () => {
      const agentWithPartialConfig = new Agent({
        context: {
          maxImagesCount: 5,
          compression: {
            enabled: true,
            // Other options should use defaults
          },
        },
      });

      expect(agentWithPartialConfig).toBeDefined();
    });
  });

  describe('strategy configuration', () => {
    it('should handle strategy-specific configuration', () => {
      const agentWithStrategyConfig = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'sliding_window',
            strategyConfig: {
              preserveRatio: 0.4,
              preserveSystemMessage: true,
              preserveRecentUserMessages: 5,
            },
          },
        },
      });

      expect(agentWithStrategyConfig).toBeDefined();
    });

    it('should handle multiple strategy configurations', () => {
      const agentWithMultipleConfigs = new Agent({
        context: {
          compression: {
            enabled: true,
            strategy: 'structured_summary',
            strategyConfig: {
              preserveRecentMessages: 15,
              useEightSectionStructure: true,
              summaryTemperature: 0.2,
            },
          },
        },
      });

      expect(agentWithMultipleConfigs).toBeDefined();
    });
  });
});
