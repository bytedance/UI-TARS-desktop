/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { AgentAppConfig } from '../types';
import { SanitizedAgentOptions, SanitizedTool } from '@tarko/interface';
import { Tool, AgentModel } from '@tarko/interface';

/**
 * Sanitize agent configuration, hiding sensitive information
 */
export function sanitizeAgentOptions(options: AgentAppConfig): SanitizedAgentOptions {
  const sanitized: SanitizedAgentOptions = {};

  // Base agent options
  if (options.id !== undefined) sanitized.id = options.id;
  if (options.name !== undefined) sanitized.name = options.name;
  if (options.instructions !== undefined) {
    // Truncate instructions for UI display
    sanitized.instructions =
      options.instructions.length > 100
        ? options.instructions.substring(0, 100) + '...'
        : options.instructions;
  }

  // Model configuration
  if (options.model !== undefined) {
    const modelConfig: AgentModel = { ...options.model };

    // Sanitize API key if present
    if (modelConfig.apiKey) {
      modelConfig.apiKey = sanitizeApiKey(modelConfig.apiKey); // secretlint-disable-line
    }

    // No providers array to sanitize in simplified model

    sanitized.model = modelConfig;
  }

  // Model-related options
  if (options.maxTokens !== undefined) sanitized.maxTokens = options.maxTokens;
  if (options.temperature !== undefined) sanitized.temperature = options.temperature;
  if (options.thinking !== undefined) sanitized.thinking = options.thinking;

  // Tool configuration
  if (options.tools !== undefined && Array.isArray(options.tools)) {
    sanitized.tools = options.tools.map(sanitizeTool);
  }

  if (options.tool !== undefined) {
    sanitized.tool = {
      include: options.tool.include,
      exclude: options.tool.exclude,
    };
  }

  if (options.toolCallEngine !== undefined) {
    // Convert tool call engine to string representation for serialization
    if (typeof options.toolCallEngine === 'string') {
      sanitized.toolCallEngine = options.toolCallEngine;
    } else if (typeof options.toolCallEngine === 'function') {
      // For constructor functions, use the class name or 'CustomEngine'
      sanitized.toolCallEngine = options.toolCallEngine.name || 'CustomEngine';
    } else {
      sanitized.toolCallEngine = 'Unknown';
    }
  }

  // Loop options
  if (options.maxIterations !== undefined) {
    sanitized.maxIterations = options.maxIterations;
  }

  // Memory options
  if (options.context !== undefined) {
    sanitized.context = options.context;
  }

  if (options.eventStreamOptions !== undefined) {
    sanitized.eventStreamOptions = options.eventStreamOptions;
  }

  if (options.enableStreamingToolCallEvents !== undefined) {
    sanitized.enableStreamingToolCallEvents = options.enableStreamingToolCallEvents;
  }

  // Misc options
  if (options.logLevel !== undefined) {
    sanitized.logLevel = options.logLevel;
  }

  // Workspace options
  if (options.workspace !== undefined) {
    sanitized.workspace = options.workspace;
    sanitized.workspaceName = path.basename(options.workspace);
  }

  return sanitized;
}

/**
 * Sanitize tool configuration, removing function implementations
 */
function sanitizeTool(tool: Tool): SanitizedTool {
  // Create a copy of the tool without the function property
  const { function: toolFunction, ...sanitized } = tool;
  return sanitized as SanitizedTool;
}

/**
 * Sanitize API key by showing only first and last few characters
 */
function sanitizeApiKey(apiKey?: string): string | undefined {
  if (!apiKey) return undefined;

  // With a 4 + 4 window, a key of 11 characters or fewer would keep at most three
  // characters hidden and the fixed three-star middle would make the masked form
  // longer than the key itself, so hide those keys completely.
  if (apiKey.length <= 11) {
    return '*'.repeat(apiKey.length);
  }

  // Show first 4 and last 4 characters, mask the middle
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(apiKey.length - 8);

  return `${start}${middle}${end}`;
}
