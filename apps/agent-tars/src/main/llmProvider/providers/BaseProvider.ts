import { Message } from '@agent-infra/shared';
import { LLMConfig, LLMProvider } from '../interfaces/LLMProvider';

/**
 * Base abstract class for all LLM providers
 * Implements common functionality and requires specific provider implementations
 */
export abstract class BaseProvider implements LLMProvider {
  protected config: LLMConfig;
  protected activeRequests = new Map<string, AbortController>();

  constructor(config: LLMConfig = {}) {
    this.config = {
      temperature: config.temperature !== undefined ? config.temperature : 0,
      maxTokens: config.maxTokens || 4000,
      topP: config.topP !== undefined ? config.topP : 1.0,
      frequencyPenalty: config.frequencyPenalty || 0,
      presencePenalty: config.presencePenalty || 0,
      ...config,
    };
  }

  /**
   * Convert Message objects to provider-specific format
   * Each provider should implement this
   */
  protected abstract formatMessages(messages: Message[]): any[];

  /**
   * Abort an active request
   */
  abortRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Clean up request controller after completion/error
   */
  protected cleanupRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  /**
   * Implementation required by subclasses
   */
  abstract askLLMText(params: {
    messages: Message[];
    requestId: string;
  }): Promise<string>;

  /**
   * Implementation required by subclasses
   */
  abstract askTool(params: any): Promise<any>;

  /**
   * Implementation required by subclasses
   */
  abstract askLLMTextStream(params: {
    messages: Message[];
    requestId: string;
  }): AsyncGenerator<string>;
}
