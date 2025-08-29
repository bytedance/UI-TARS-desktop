/**
 * Base API URL for server communication
 */

export const API_BASE_URL = window.AGENT_BASE_URL ?? 'http://localhost:3000';

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
 * WebSocket events
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_FAILED: 'reconnect_failed',
  JOIN_SESSION: 'join-session',
  AGENT_EVENT: 'agent-event',
  AGENT_STATUS: 'agent-status',
  PING: 'ping',
  SEND_QUERY: 'send-query',
  ABORT_QUERY: 'abort-query',
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

/**
 * Connection settings
 */
export const CONNECTION_SETTINGS = {
  HEARTBEAT_INTERVAL: 15000,
  MAX_MISSED_HEARTBEATS: 2,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
};


