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
import { extractThink, extractAnswer } from './extractors';
import { extractCodeEnv } from './extractCode';

export interface OmniStreamProcessingState extends StreamProcessingState {
  // Additional state for tag parsing
  currentTag?: 'think' | 'answer' | 'code_env' | null;
  insideThink?: boolean;
  thinkParseCompleted?: boolean; // It means that the current loop has processed think, and the subsequent chunk no longer needs to be parsed.
  insideAnswer?: boolean;
  insideCodeEnv?: boolean;
  thinkBuffer?: string; // separate buffer for think parsing
  answerBuffer?: string; // separate buffer for answer parsing
  accumulatedAnswerBuffer?: string; // Accumulation of parsed answer content

  // For code_env tool call parsing
  codeEnvBuffer?: string;
  currentToolName?: string;
  currentParameters?: Record<string, string>;
  parameterBuffer?: string;
  currentParameterName?: string;
  insideParameter?: boolean;
  insideFunction?: boolean;
  functionBuffer?: string;
  currentToolCallId?: string;

  //For mcp_env and gui_env
  insideMcp?: boolean; // The current loop needs to handle mcp tasks
  insideGUI?: boolean; // The loop needs to handle gui tasks
}

export interface StreamingParseResult {
  content: string;
  reasoningContent: string;
}

/**
 * Creates a new tag state for streaming parsing
 */
export function createInitState(): OmniStreamProcessingState {
  return {
    contentBuffer: '',
    accumulatedAnswerBuffer: '',
    toolCalls: [],
    reasoningBuffer: '',
    finishReason: null,
    thinkBuffer: '',
    answerBuffer: '',
    currentTag: null,
    insideThink: false,
    thinkParseCompleted: false,
    insideAnswer: false,
    insideCodeEnv: false,
    codeEnvBuffer: '',
    currentToolName: '',
    currentParameters: {},
    parameterBuffer: '',
    currentParameterName: '',
    insideParameter: false,
    insideFunction: false,
    functionBuffer: '',
    currentToolCallId: '',
    insideMcp: false,
    insideGUI: false,
  };
}

/**
 * Parse streaming chunk content to extract think/answer/code_env tag content
 * This function processes delta in the chunk to detect opening and closing tags
 * and accumulates content inside think and answer tags appropriately.
 *
 * Real-time streaming behavior:
 * - For think tags: returns incremental reasoning content as it arrives
 * - For answer tags: returns incremental answer content as it arrives
 * - For code_env tags: if function is str_replace_editor and it's parameter 'command' value equals to 'create',  then  return incremental parameter  'file_text' content as it arrives
 *
 * @param chunk The chunk content to process
 * @param tagState The current tag state to maintain across chunks
 * @returns Object containing content and reasoningContent for this chunk
 */
export function processStreamingChunk(
  chunk: ChatCompletionChunk,
  state: OmniStreamProcessingState,
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

  if (delta?.content) {
    state.contentBuffer += delta.content;

    reasoningContent = extractThink(delta.content, state);
    content = extractAnswer(delta.content, state);
    const parsed = extractCodeEnv(delta.content, state);
    hasToolCallUpdate = parsed.hasToolCallUpdate;
    streamingToolCallUpdates = parsed.streamingToolCallUpdates || [];
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
