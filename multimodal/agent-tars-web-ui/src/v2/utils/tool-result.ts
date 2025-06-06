/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard multimodal content part for tool results
 * This is compatible with the LLM's content part format
 */
export interface ToolResultContentPart {
  /** Content type identifier */
  type: string;

  /** Content name for categorization/identification */
  name?: string;

  /** Optional metadata about this content */
  metadata?: Record<string, any>;

  /** Actual content - could be text, base64 image, or other data */
  [key: string]: any;
}

/**
 * Standard tool result format that tools should convert their results to
 * This enables consistent handling and rendering of different tool results
 */
export interface StandardToolResult {
  /** Unique identifier for this result */
  id?: string;

  /** Tool call ID this result is responding to */
  toolCallId: string;

  /** Tool name */
  name: string;

  /** Result content in standardized multimodal format */
  content: ToolResultContentPart[];

  /** Timestamp when the result was generated */
  timestamp: number;

  /** Error message if the tool execution failed */
  error?: string;

  /** Original raw content from the tool (for debugging or custom handling) */
  rawContent?: any;
}
