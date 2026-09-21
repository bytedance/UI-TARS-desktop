/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsonrepair } from 'jsonrepair';

/**
 * Normalize tool call arguments to a valid JSON string for OpenAI-compatible APIs.
 * Handles object arguments, empty strings, and malformed JSON from some providers.
 */
export function normalizeToolCallArgumentsString(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '{}';
  }

  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return '{}';
    }
  }

  if (typeof raw !== 'string') {
    return '{}';
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[object Object]') {
    return '{}';
  }

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    try {
      const repaired = jsonrepair(trimmed);
      JSON.parse(repaired);
      return repaired;
    } catch {
      return '{}';
    }
  }
}

/**
 * Coerce hook or parsed values into tool-call argument objects.
 */
export function coerceToolCallArguments(value: unknown): Record<string, any> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

/**
 * Parse tool call arguments for tool execution.
 */
export function parseToolCallArguments(raw: unknown): Record<string, any> {
  const normalized = normalizeToolCallArgumentsString(raw);
  return coerceToolCallArguments(JSON.parse(normalized));
}
