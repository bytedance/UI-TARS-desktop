/**
 * Header configuration management for different LLM providers
 * Handles provider-specific headers including feature flags and API versions
 */

import { LLMProvider } from '../chat/index.js';

/**
 * Provider-specific header configuration
 */
export interface ProviderHeaderConfig {
  /** Static headers always included */
  static?: Record<string, string>;
  /** Dynamic headers based on model */
  dynamic?: (model: string) => Record<string, string>;
  /** Conditional headers based on request parameters */
  conditional?: (params: any) => Record<string, string>;
}

/**
 * Header configuration registry for all providers
 */
export class HeaderConfigRegistry {
  private static configs: Partial<Record<LLMProvider, ProviderHeaderConfig>> = {};

  /**
   * Register header configuration for a provider
   */
  static register(provider: LLMProvider, config: ProviderHeaderConfig): void {
    this.configs[provider] = config;
  }

  /**
   * Get header configuration for a provider
   */
  static get(provider: LLMProvider): ProviderHeaderConfig | undefined {
    return this.configs[provider];
  }

  /**
   * Generate headers for a specific provider and request
   */
  static generateHeaders(
    provider: LLMProvider,
    model: string,
    params?: any
  ): Record<string, string> {
    const config = this.get(provider);
    if (!config) return {};

    const headers: Record<string, string> = {};

    // Add static headers
    if (config.static) {
      Object.assign(headers, config.static);
    }

    // Add dynamic headers based on model
    if (config.dynamic) {
      Object.assign(headers, config.dynamic(model));
    }

    // Add conditional headers based on parameters
    if (config.conditional && params) {
      Object.assign(headers, config.conditional(params));
    }

    return headers;
  }
}

/**
 * Claude model detection utilities
 */
export class ClaudeModelDetector {
  private static readonly CLAUDE_MODEL_PATTERNS = [
    /^claude-/i,
    /^anthropic\//i,
  ];

  /**
   * Check if a model is a Claude model
   */
  static isClaudeModel(model: string): boolean {
    return this.CLAUDE_MODEL_PATTERNS.some(pattern => pattern.test(model));
  }

  /**
   * Get Claude-specific beta features
   */
  static getClaudeBetaFeatures(): string[] {
    return [
      'fine-grained-tool-streaming-2025-05-14',
      'token-efficient-tools-2025-02-19',
    ];
  }
}

/**
 * Initialize default provider configurations
 */
export function initializeDefaultConfigs(): void {
  // Anthropic/Claude configuration
  HeaderConfigRegistry.register('anthropic', {
    dynamic: (model: string) => {
      if (ClaudeModelDetector.isClaudeModel(model)) {
        return {
          'anthropic-beta': ClaudeModelDetector.getClaudeBetaFeatures().join(',')
        };
      }
      return {};
    },
    conditional: (params) => {
      const headers: Record<string, string> = {};
      
      // Add conditional headers based on request features
      if (params?.tools && ClaudeModelDetector.isClaudeModel(params.model)) {
        // Ensure tool streaming is enabled for tool calls
        const existing = headers['anthropic-beta'] || '';
        const betaFeatures = ClaudeModelDetector.getClaudeBetaFeatures();
        const combined = existing ? 
          `${existing},${betaFeatures.join(',')}` : 
          betaFeatures.join(',');
        headers['anthropic-beta'] = combined;
      }
      
      return headers;
    }
  });

  // Other providers can be added here
  // HeaderConfigRegistry.register('openai', { ... });
  // HeaderConfigRegistry.register('gemini', { ... });
}
