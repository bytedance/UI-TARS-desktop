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

/**
 * Get GUI Agent configuration from web UI config
 */
export function getGUIAgentConfig() {
  return (
    getWebUIConfig().guiAgent || {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: false,
      renderGUIAction: true,
      renderBrowserShell: true,
    }
  );
}

/**
 * Get layout configuration from web UI config
 */
export function getLayoutConfig() {
  return (
    getWebUIConfig().layout || {
      defaultLayout: 'default',
      enableLayoutSwitchButton: false,
    }
  );
}

/**
 * Check if layout switch button is enabled
 */
export function isLayoutSwitchButtonEnabled(): boolean {
  return getLayoutConfig().enableLayoutSwitchButton ?? false;
}

/**
 * Get default layout mode from web UI config
 */
export function getDefaultLayoutMode() {
  return getLayoutConfig().defaultLayout || 'default';
}
