/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getAvailableModels,
  getDefaultModel,
  isModelConfigValid,
} from '../../src/utils/model-utils';
import type { AgentAppConfig, AgentModel } from '../../src/types';

describe('model-utils', () => {
  const mockModel1: AgentModel = {
    provider: 'openai',
    id: 'gpt-4',
    displayName: 'GPT-4',
  };

  const mockModel2: AgentModel = {
    provider: 'anthropic',
    id: 'claude-3',
    displayName: 'Claude 3',
  };

  const mockModel3: AgentModel = {
    provider: 'openai',
    id: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
  };

  describe('getAvailableModels', () => {
    it('should return empty array when no models configured', () => {
      const config: AgentAppConfig = {};
      const result = getAvailableModels(config);
      expect(result).toEqual([]);
    });

    it('should return only AgentOptions.model when server.models is not set', () => {
      const config: AgentAppConfig = {
        model: mockModel1,
      };
      const result = getAvailableModels(config);
      expect(result).toEqual([mockModel1]);
    });

    it('should return only server.models when AgentOptions.model is not set', () => {
      const config: AgentAppConfig = {
        server: {
          models: [mockModel2, mockModel3],
        },
      };
      const result = getAvailableModels(config);
      expect(result).toEqual([mockModel2, mockModel3]);
    });

    it('should merge AgentOptions.model with server.models', () => {
      const config: AgentAppConfig = {
        model: mockModel1,
        server: {
          models: [mockModel2, mockModel3],
        },
      };
      const result = getAvailableModels(config);
      expect(result).toEqual([mockModel1, mockModel2, mockModel3]);
    });

    it('should handle empty server.models array', () => {
      const config: AgentAppConfig = {
        model: mockModel1,
        server: {
          models: [],
        },
      };
      const result = getAvailableModels(config);
      expect(result).toEqual([mockModel1]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return undefined when no models configured', () => {
      const config: AgentAppConfig = {};
      const result = getDefaultModel(config);
      expect(result).toBeUndefined();
    });

    it('should prefer AgentOptions.model over server.models', () => {
      const config: AgentAppConfig = {
        model: mockModel1,
        server: {
          models: [mockModel2, mockModel3],
        },
      };
      const result = getDefaultModel(config);
      expect(result).toEqual(mockModel1);
    });

    it('should return first server.models when AgentOptions.model is not set', () => {
      const config: AgentAppConfig = {
        server: {
          models: [mockModel2, mockModel3],
        },
      };
      const result = getDefaultModel(config);
      expect(result).toEqual(mockModel2);
    });

    it('should return undefined when server.models is empty', () => {
      const config: AgentAppConfig = {
        server: {
          models: [],
        },
      };
      const result = getDefaultModel(config);
      expect(result).toBeUndefined();
    });
  });

  describe('isModelConfigValid', () => {
    const config: AgentAppConfig = {
      model: mockModel1,
      server: {
        models: [mockModel2, mockModel3],
      },
    };

    it('should return true for valid model config from AgentOptions.model', () => {
      const result = isModelConfigValid(config, 'openai', 'gpt-4');
      expect(result).toBe(true);
    });

    it('should return true for valid model config from server.models', () => {
      const result1 = isModelConfigValid(config, 'anthropic', 'claude-3');
      const result2 = isModelConfigValid(config, 'openai', 'gpt-3.5-turbo');
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should return false for invalid provider', () => {
      const result = isModelConfigValid(config, 'invalid-provider', 'gpt-4');
      expect(result).toBe(false);
    });

    it('should return false for invalid model id', () => {
      const result = isModelConfigValid(config, 'openai', 'invalid-model');
      expect(result).toBe(false);
    });

    it('should return false when no models configured', () => {
      const emptyConfig: AgentAppConfig = {};
      const result = isModelConfigValid(emptyConfig, 'openai', 'gpt-4');
      expect(result).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const result1 = isModelConfigValid(config, 'OpenAI', 'gpt-4');
      const result2 = isModelConfigValid(config, 'openai', 'GPT-4');
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });
});
