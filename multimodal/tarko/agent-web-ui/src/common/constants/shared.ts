/**
 * Shared configuration utilities for accessing dynamic web UI config
 */

/**
 * Get web UI configuration from global window object
 * This config is injected by the server at runtime
 */
export function getWebUIConfig() {
  return window.AGENT_WEB_UI_CONFIG || {};
}

/**
 * Get agent title from web UI config with fallback
 */
export function getAgentTitle(): string {
  return getWebUIConfig().title || 'Agent';
}
