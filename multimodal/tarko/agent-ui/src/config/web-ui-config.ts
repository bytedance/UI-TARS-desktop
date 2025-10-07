/**
 * Shared configuration utilities for accessing dynamic web UI config
 * Enhanced to support multiple configuration sources with fallback strategy
 */

import { extractActualBasename } from '@tarko/shared-utils';
import { loadWebUIConfigSync } from './config-loader';
import type { BaseAgentWebUIImplementation } from '@tarko/interface';
import { ENV_CONFIG } from '@/common/constants';

/**
 * Get Agent UI Configuration with enhanced multi-source loading
 */
export function getWebUIConfig(): BaseAgentWebUIImplementation {
  const result = loadWebUIConfigSync();
  return result.config;
}

/**
 * Get Agent UI Configuration with enhanced multi-source loading
 */
export function getWebUIRouteBase(): string {
  // Extract actual basename from current URL using shared utility
  const currentPath = window.location.pathname;
  const config = getWebUIConfig();
  const actualBasename = extractActualBasename(config.base, currentPath);
  console.log('[Agent UI] base config:', config.base);
  console.log('[Agent UI] current path:', currentPath);
  console.log('[Agent UI] extracted basename:', actualBasename);
  return actualBasename;
}

/**
 * Get API Base URL.
 */
export function getAPIBaseUrl() {
  const configuredBaseUrl = ENV_CONFIG.AGENT_BASE_URL ?? window.AGENT_BASE_URL;
  /**
   * Scene 1. The Agent Server and Agent UI are deployed together ()
   * If routeBase exists, we should respect it
   */
  if (configuredBaseUrl === '') {
    const routeBase = getWebUIRouteBase();
    if (routeBase) {
      return configuredBaseUrl + routeBase;
    }
    return configuredBaseUrl;
  }

  /**
   * Scene 1. The Agent Server and Agent UI are deployed in different locations
   * We should directly respect the API Base URL
   */
  return configuredBaseUrl;
}

export const API_BASE_URL = getAPIBaseUrl();

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
export function getWorkspaceNavItems(prefix?: string) {
  const items = getWebUIConfig().workspace?.navItems || [];

  if(prefix) {
      items.forEach(item => {
        item.link = item.link.replace('{prefix}', prefix);
      });
  }

  return items;
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
      enableSidebar: true,
      enableHome: true,
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
 * Check if sidebar is enabled
 */
export function isSidebarEnabled(): boolean {
  return getLayoutConfig().enableSidebar ?? true;
}

/**
 * Check if home route is enabled
 */
export function isHomeEnabled(): boolean {
  return getLayoutConfig().enableHome ?? true;
}

/**
 * Get debug configuration from web UI config
 */
export function getDebugConfig() {
  return (
    getWebUIConfig().debug || {
      enableEventStreamViewer: false,
    }
  );
}

/**
 * Check if Event Stream Viewer is enabled
 */
export function isEventStreamViewerEnabled(): boolean {
  return getDebugConfig().enableEventStreamViewer ?? false;
}
