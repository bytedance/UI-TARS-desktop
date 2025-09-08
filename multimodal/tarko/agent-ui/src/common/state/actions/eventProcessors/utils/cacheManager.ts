import { ToolCallArgumentsCache, StreamingToolCallCache } from '../types';

/**
 * Tool call arguments cache implementation
 */
class ToolCallArgumentsCacheImpl implements ToolCallArgumentsCache {
  private cache = new Map<string, unknown>();

  get(toolCallId: string): unknown {
    return this.cache.get(toolCallId);
  }

  set(toolCallId: string, args: unknown): void {
    this.cache.set(toolCallId, args);
  }

  delete(toolCallId: string): void {
    this.cache.delete(toolCallId);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Streaming tool call arguments cache implementation
 */
class StreamingToolCallCacheImpl implements StreamingToolCallCache {
  private cache = new Map<string, string>();

  get(toolCallId: string): string {
    return this.cache.get(toolCallId) || '';
  }

  set(toolCallId: string, args: string): void {
    this.cache.set(toolCallId, args);
  }

  delete(toolCallId: string): void {
    this.cache.delete(toolCallId);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const toolCallArgumentsCache = new ToolCallArgumentsCacheImpl();
export const streamingToolCallCache = new StreamingToolCallCacheImpl();
