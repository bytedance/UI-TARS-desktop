/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ChatCompletionChunk,
  StreamChunkResult,
  StreamingToolCallUpdate,
  StreamProcessingState,
} from '@tarko/agent-interface';
import { extractThinkT5 } from './extractThinkT5';
import { extractToolCallT5 } from './extractToolCallT5';
import { extractChatContentT5 } from './extractChatContentT5';

export interface T5StreamProcessingState extends StreamProcessingState {
  // For think parsing with dynamic tag
  currentTag?: 'think' | 'chat_content' | 'tool_call' | null;
  insideThink?: boolean;
  thinkParseCompleted?: boolean;
  thinkBuffer?: string;

  // For chat content parsing (similar to answer but different tag)
  insideChatContent?: boolean;
  accumulatedChatContentBuffer?: string;

  // For tool call parsing with seed:tool_call format
  insideToolCall?: boolean;
  toolCallBuffer?: string;
  currentToolName?: string;
  currentParameters?: Record<string, string>;
  parameterBuffer?: string;
  currentParameterName?: string;
  insideParameter?: boolean;
  insideFunction?: boolean;
  functionBuffer?: string;
  currentToolCallId?: string;
  functionCount?: number; // Track multiple functions
}

export interface T5StreamingParseResult {
  content: string;
  reasoningContent: string;
}

/**
 * Creates a new tag state for T5 streaming parsing
 */
export function createT5InitState(): T5StreamProcessingState {
  return {
    contentBuffer: '',
    toolCalls: [],
    reasoningBuffer: '',
    finishReason: null,
    thinkBuffer: '',
    accumulatedChatContentBuffer: '',
    toolCallBuffer: '',
    currentTag: null,
    insideThink: false,
    thinkParseCompleted: false,
    insideChatContent: false,
    insideToolCall: false,
    currentToolName: '',
    currentParameters: {},
    parameterBuffer: '',
    currentParameterName: '',
    insideParameter: false,
    insideFunction: false,
    functionBuffer: '',
    currentToolCallId: '',
    functionCount: 0,
  };
}

/**
 * Parse streaming chunk content to extract think/chat_content/seed:tool_call tag content
 * This function processes delta in the chunk to detect opening and closing tags
 * and accumulates content inside think and chat content tags appropriately.
 *
 * Real-time streaming behavior:
 * - For think tags: returns incremental reasoning content as it arrives
 * - For chat content: returns incremental content as it arrives (similar to answer)
 * - For seed:tool_call tags: returns tool call updates for multiple functions
 *
 * @param chunk The chunk content to process
 * @param state The current tag state to maintain across chunks
 * @returns Object containing content and reasoningContent for this chunk
 */
export function processT5StreamingChunk(
  chunk: ChatCompletionChunk,
  state: T5StreamProcessingState,
): StreamChunkResult {
  const delta = chunk.choices[0]?.delta;
  let content = '';
  let reasoningContent = '';
  let hasToolCallUpdate = false;
  let streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

  // Record finish reason
  if (chunk.choices[0]?.finish_reason) {
    state.finishReason = chunk.choices[0].finish_reason;
  }

  // @ts-expect-error Not in OpenAI types but present in compatible LLMs
  if (delta?.reasoning_content) {
    // @ts-expect-error
    reasoningContent = delta.reasoning_content;
    state.reasoningBuffer += reasoningContent;
  }

  if (delta?.content) {
    state.contentBuffer += delta.content;

    // Parse think content first - this will set insideThink flag and manage thinkBuffer
    reasoningContent = extractThinkT5(delta.content, state);

    // Parse tool calls - this will set insideToolCall flag and manage toolCallBuffer
    const toolParsed = extractToolCallT5(delta.content, state);
    hasToolCallUpdate = toolParsed.hasToolCallUpdate;
    streamingToolCallUpdates = toolParsed.streamingToolCallUpdates || [];

    // Parse chat content - this will handle content outside of think/tool tags
    // It uses its own buffer (chatContentBuffer) that's separate from thinkBuffer/toolCallBuffer
    content = extractChatContentT5(delta.content, state);
  }

  return {
    /**
     * Content to add to the streaming message (may be empty if chunk was tool call related)
     */
    content,

    /**
     * Reasoning content to add (may be empty)
     */
    reasoningContent,

    /**
     * Whether this chunk contained a tool call update
     */
    hasToolCallUpdate,

    /**
     * Current state of tool calls (if any)
     */
    toolCalls: state.toolCalls,

    /**
     * Streaming tool call updates for this chunk
     * Contains delta information for real-time tool call construction
     */
    streamingToolCallUpdates,
  };
}
