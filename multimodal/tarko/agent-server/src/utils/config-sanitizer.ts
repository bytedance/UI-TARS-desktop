/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { AgentAppConfig } from '../types';
import { SanitizedAgentOptions, SanitizedTool } from '@tarko/interface';
import { Tool, ProviderOptions } from '@tarko/interface';

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
    const modelConfig: ProviderOptions = { ...options.model };

    // Sanitize API key if present
    if (modelConfig.apiKey) {
      modelConfig.apiKey = sanitizeApiKey(modelConfig.apiKey); // secretlint-disable-line
    }

    // Sanitize providers array if present
    if (modelConfig.providers && Array.isArray(modelConfig.providers)) {
      modelConfig.providers = modelConfig.providers.map((provider: any) => {
        const sanitizedProvider = { ...provider };
        if (sanitizedProvider.apiKey) {
          sanitizedProvider.apiKey = sanitizeApiKey(sanitizedProvider.apiKey); // secretlint-disable-line
        }
        return sanitizedProvider;
      });
    }

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

  if (apiKey.length <= 8) {
    return '*'.repeat(apiKey.length);
  }

  // Show first 4 and last 4 characters, mask the middle
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(Math.max(apiKey.length - 8, 3));

  return `${start}${middle}${end}`;
}
