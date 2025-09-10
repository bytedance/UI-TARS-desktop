/**
 * Shared configuration utilities for accessing dynamic web UI config
 * Enhanced to support multiple configuration sources with fallback strategy
 */

import { loadWebUIConfigSync } from './config-loader';
import type { BaseAgentWebUIImplementation } from '@tarko/interface';

let cachedConfig: BaseAgentWebUIImplementation | null = null;
let lastConfigCheck = 0;
const CONFIG_CACHE_TTL = 5000; // 5 seconds

/**
 * Get web UI configuration with enhanced multi-source loading
 * Maintains backward compatibility with existing API
 */
export function getWebUIConfig(): BaseAgentWebUIImplementation {
  const now = Date.now();

  // Use cached config if available and fresh
  if (cachedConfig && now - lastConfigCheck < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  // Load configuration from all sources
  const result = loadWebUIConfigSync();
  cachedConfig = result.config;
  lastConfigCheck = now;

  return cachedConfig;
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

/**
 * Clear configuration cache
 * Useful for forcing config reload
 */
export function clearConfigCache() {
  cachedConfig = null;
  lastConfigCheck = 0;
}

/**
 * Get configuration loading source information
 * Useful for debugging configuration issues
 */
export function getConfigSource() {
  const result = loadWebUIConfigSync();
  return {
    source: result.source,
    error: result.error,
  };
}
