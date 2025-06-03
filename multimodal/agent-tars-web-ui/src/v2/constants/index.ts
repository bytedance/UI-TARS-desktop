/**
 * Base API URL for server communication
 */
// @ts-expect-error
export const API_BASE_URL = window.AGENT_TARS_BASE_URL ?? 'http://localhost:3000';
console.log('API_BASE_URL', API_BASE_URL);

/**
 * Default API endpoints
 */
export const API_ENDPOINTS = {
  SESSIONS: '/api/sessions',
  CREATE_SESSION: '/api/sessions/create',
  SESSION_DETAILS: '/api/sessions/details',
  SESSION_EVENTS: '/api/sessions/events',
  SESSION_STATUS: '/api/sessions/status',
  UPDATE_SESSION: '/api/sessions/update',
  DELETE_SESSION: '/api/sessions/delete',
  RESTORE_SESSION: '/api/sessions/restore',
  QUERY: '/api/sessions/query',
  QUERY_STREAM: '/api/sessions/query/stream',
  ABORT: '/api/sessions/abort',
  GENERATE_SUMMARY: '/api/sessions/generate-summary',
  HEALTH: '/api/health',
  BROWSER_CONTROL_INFO: '/api/sessions/browser-control',
  MODEL_INFO: '/api/model-info', // 新增模型信息端点
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
 * Tool types
 */
export const TOOL_TYPES = {
  SEARCH: 'search',
  BROWSER: 'browser',
  COMMAND: 'command',
  IMAGE: 'image',
  FILE: 'file',
  BROWSER_CONTROL: 'browser_vision_control', // 添加新的工具类型
  OTHER: 'other',
} as const;

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