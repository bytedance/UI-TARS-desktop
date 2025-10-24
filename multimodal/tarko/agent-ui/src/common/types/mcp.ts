/**
 * MCP (Model Context Protocol) Types
 * Type definitions for MCP servers, tools, and related entities
 */

/**
 * MCP Server status
 */
export type MCPServerStatus = 'active' | 'inactive' | 'activating' | 'error';

/**
 * MCP Server type
 */
export type MCPServerType = 'command' | 'http' | 'sse' | 'in-memory';

/**
 * MCP Server configuration
 */
export interface MCPServer {
  name: string;
  type: MCPServerType;
  status: MCPServerStatus;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  filters?: {
    allow?: string[];
    block?: string[];
  };
  lastError?: string;
  lastErrorTime?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * JSON Schema for tool parameters
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  enum?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  id: string;
  name: string;
  description?: string;
  parametersSchema?: JSONSchema;
}

/**
 * Tool call result
 */
export interface MCPToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

/**
 * Streaming event types
 */
export type MCPStreamEventType = 'partial' | 'done' | 'error';

/**
 * Streaming event
 */
export interface MCPStreamEvent {
  type: MCPStreamEventType;
  data?: any;
  error?: string;
}

/**
 * Server status response
 */
export interface MCPServerStatusResponse {
  status: MCPServerStatus;
  lastError?: string;
  detail?: any;
}

/**
 * API Response types
 */
export interface MCPApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

export interface MCPServersResponse {
  servers: MCPServer[];
}

export interface MCPToolsResponse {
  tools: MCPTool[];
}