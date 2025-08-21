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

/**
 * Check if contextual selector is enabled
 */
export function isContextualSelectorEnabled(): boolean {
  return getWebUIConfig().enableContextualSelector ?? false;
}

/**
 * Get logo URL from web UI config with fallback
 */
export function getLogoUrl(): string {
  return (
    getWebUIConfig().logo ||
    'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png'
  );
}

/**
 * Get workspace navigation items from web UI config
 */
export function getWorkspaceNavItems() {
  return getWebUIConfig().workspace?.navItems || [];
}
