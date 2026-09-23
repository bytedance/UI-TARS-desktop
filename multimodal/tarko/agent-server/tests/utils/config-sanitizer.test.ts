/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { sanitizeAgentOptions } from '../../src/utils/config-sanitizer';
import type { AgentAppConfig } from '../../src/types';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const maskApiKey = (apiKey: string): string | undefined => {
  const config: AgentAppConfig = {
    model: { provider: 'openai', id: 'gpt-4', apiKey },
  };

  return sanitizeAgentOptions(config).model?.apiKey;
};

describe('config-sanitizer', () => {
  describe('sanitizeAgentOptions().model.apiKey', () => {
    it('should omit the key when it is not configured', () => {
      const config: AgentAppConfig = { model: { provider: 'openai', id: 'gpt-4' } };

      expect(sanitizeAgentOptions(config).model?.apiKey).toBeUndefined();
    });

    it('should keep the masked form the same length as the key', () => {
      for (let length = 1; length <= 40; length++) {
        const key = (ALPHABET + ALPHABET).slice(0, length);
        const masked = maskApiKey(key);

        expect(masked, `key length ${length} -> ${masked}`).toHaveLength(length);
      }
    });

    it('should hide short keys completely instead of most of them', () => {
      // 4 + 4 visible characters over a 9-character key leaves a single character hidden
      expect(maskApiKey('abcdefghi')).toBe('*********');
      expect(maskApiKey('abcdefghijkl')).toBe('abcd****ijkl');
    });

    it('should keep showing first and last characters of a real-world key', () => {
      const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789';

      expect(maskApiKey(key)).toBe(`sk-p${'*'.repeat(key.length - 8)}6789`);
    });
  });
});
