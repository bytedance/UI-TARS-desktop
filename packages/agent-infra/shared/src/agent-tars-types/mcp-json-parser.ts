/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MCPServer } from '@agent-infra/mcp-shared/client';

/**
 * Standard MCP server configuration entry in JSON format.
 * Supports both stdio (command-based) and network-based (url-based) servers.
 */
export interface MCPServerJsonEntry {
  /** Command to launch the server (for stdio transport) */
  command?: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables for the server process */
  env?: Record<string, string>;
  /** Working directory for the server process */
  cwd?: string;
  /** URL for SSE or Streamable HTTP transport */
  url?: string;
  /** Headers for network-based transports */
  headers?: Record<string, string>;
  /** Custom description */
  description?: string;
  /** Timeout in seconds */
  timeout?: number;
  /** Any additional fields */
  [key: string]: unknown;
}

/**
 * Supported MCP JSON configuration formats
 */
export interface MCPJsonConfig {
  /** Standard format key */
  mcpServers?: Record<string, MCPServerJsonEntry>;
  /** Alternative format key (some tools use "servers") */
  servers?: Record<string, MCPServerJsonEntry>;
  /** Allow top-level unknown fields */
  [key: string]: unknown;
}

/**
 * Result of parsing MCP JSON configuration
 */
export interface MCPJsonParseResult {
  /** Successfully parsed servers */
  servers: Array<MCPServer & { id: string }>;
  /** Parse errors, if any */
  errors: string[];
}

/**
 * Parse standard MCP JSON configuration into the internal MCPServer format.
 *
 * Supports two common JSON formats:
 * 1. `{"mcpServers": {"name": {"command": "...", "args": [...]}}}`
 * 2. `{"servers": {"name": {"command": "...", "args": [...]}}}`
 *
 * Also supports URL-based servers:
 * `{"mcpServers": {"name": {"url": "http://...", "headers": {...}}}}`
 *
 * @param jsonText - Raw JSON text to parse
 * @returns Parse result with servers and errors
 */
export function parseMCPJsonConfig(jsonText: string): MCPJsonParseResult {
  const errors: string[] = [];
  const servers: Array<MCPServer & { id: string }> = [];

  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      servers: [],
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  // Step 2: Validate top-level structure
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      servers: [],
      errors: ['Configuration must be a JSON object'],
    };
  }

  const config = parsed as MCPJsonConfig;
  const serverEntries = config.mcpServers || config.servers;

  if (!serverEntries) {
    return {
      servers: [],
      errors: [
        'Missing "mcpServers" or "servers" key. Expected format: {"mcpServers": {"server-name": {...}}}',
      ],
    };
  }

  if (typeof serverEntries !== 'object' || Array.isArray(serverEntries)) {
    return {
      servers: [],
      errors: ['"mcpServers"/"servers" must be an object mapping server names to configurations'],
    };
  }

  // Step 3: Parse each server entry
  for (const [name, entry] of Object.entries(serverEntries)) {
    try {
      const server = parseServerEntry(name, entry);
      servers.push(server);
    } catch (e) {
      errors.push(`Server "${name}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { servers, errors };
}

/**
 * Parse a single server entry into the internal MCPServer format
 */
function parseServerEntry(
  name: string,
  entry: unknown,
): MCPServer & { id: string } {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new Error('Server configuration must be a JSON object');
  }

  const config = entry as MCPServerJsonEntry;

  // Determine transport type
  const hasCommand = typeof config.command === 'string' && config.command.length > 0;
  const hasUrl = typeof config.url === 'string' && config.url.length > 0;

  if (!hasCommand && !hasUrl) {
    throw new Error('Server must have either "command" (for stdio) or "url" (for SSE/HTTP)');
  }

  if (hasCommand && hasUrl) {
    throw new Error('Server cannot have both "command" and "url" - use one transport type');
  }

  const baseServer = {
    name,
    id: name,
    description: config.description,
    timeout: config.timeout,
  };

  if (hasCommand) {
    // stdio transport
    if (config.args !== undefined && !Array.isArray(config.args)) {
      throw new Error('"args" must be an array of strings');
    }
    if (config.env !== undefined && (typeof config.env !== 'object' || Array.isArray(config.env))) {
      throw new Error('"env" must be an object mapping string keys to string values');
    }

    return {
      ...baseServer,
      type: 'stdio' as const,
      command: config.command!,
      args: config.args,
      env: config.env,
      cwd: config.cwd,
    };
  }

  // SSE or Streamable HTTP transport
  if (config.headers !== undefined && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
    throw new Error('"headers" must be an object');
  }

  // Default to streamable-http for url-based servers
  return {
    ...baseServer,
    type: 'streamable-http' as const,
    url: config.url!,
    headers: config.headers,
  };
}

/**
 * Generate example MCP JSON configuration text for display purposes
 */
export function getMCPJsonExample(): string {
  return JSON.stringify(
    {
      mcpServers: {
        'my-server': {
          command: 'npx',
          args: ['-y', '@example/mcp-server'],
          env: { API_KEY: 'your-api-key' },
        },
      },
    },
    null,
    2,
  );
}
