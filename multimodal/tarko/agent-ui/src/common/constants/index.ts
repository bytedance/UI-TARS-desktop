/**
 * Base API URL for server communication
 * Priority: window.AGENT_BASE_URL > process.env.AGENT_BASE_URL > production fallback > development default
 */

import type { AgentWebUIImplementation } from '@tarko/interface';

export const ENV_CONFIG = {
  AGENT_BASE_URL: process.env.AGENT_BASE_URL as string,
  AGENT_WEBUI_CONFIG: process.env.AGENT_WEBUI_CONFIG as AgentWebUIImplementation,
} as const;

/**
 * Default API endpoints
 */
export const API_ENDPOINTS = {
  SESSIONS: '/api/v1/sessions',
  CREATE_SESSION: '/api/v1/sessions/create',
  SESSION_DETAILS: '/api/v1/sessions/details',
  SESSION_EVENTS: '/api/v1/sessions/events',
  SESSION_STATUS: '/api/v1/sessions/status',
  UPDATE_SESSION: '/api/v1/sessions/update',
  DELETE_SESSION: '/api/v1/sessions/delete',
  QUERY: '/api/v1/sessions/query',
  QUERY_STREAM: '/api/v1/sessions/query/stream',
  ABORT: '/api/v1/sessions/abort',
  GENERATE_SUMMARY: '/api/v1/sessions/generate-summary',
  HEALTH: '/api/v1/health',

  // Share endpoints
  SHARE_CONFIG: '/api/v1/share/config',
  SESSIONS_SHARE: '/api/v1/sessions/share',

  // System endpoints
  VERSION: '/api/v1/version',

  AGENT_OPTIONS: '/api/v1/agent/options',

  // Workspace endpoints
  WORKSPACE_SEARCH: '/api/v1/sessions/workspace/search',
  WORKSPACE_VALIDATE: '/api/v1/sessions/workspace/validate',
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  ACTIVE_SESSION: 'agent-tars-active-session',
  THEME: 'agent-tars-theme',
};

/**
 * Message roles
 */
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;
