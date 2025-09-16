/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BaseAgentWebUIImplementation } from '@tarko/interface';
import { loadWebUIConfigSync, type ConfigLoadResult } from './config-loader';

/**
 * WebUI Config Context type
 */
interface WebUIConfigContext {
  config: BaseAgentWebUIImplementation;
  error?: string;
  source: ConfigLoadResult['source'];
  reload: () => void;
}

/**
 * WebUI Config React Context
 */
const WebUIConfigContext = createContext<WebUIConfigContext | null>(null);

/**
 * Props for WebUIConfigProvider
 */
interface WebUIConfigProviderProps {
  children: ReactNode;
}

/**
 * WebUI Configuration Provider Component
 * Provides configuration context to the entire application
 */
export function WebUIConfigProvider({ children }: WebUIConfigProviderProps) {
  const [configState, setConfigState] = useState<{
    config: BaseAgentWebUIImplementation;
    error?: string;
    source: ConfigLoadResult['source'];
  }>(() => {
    // Initialize with synchronous config loading
    const syncResult = loadWebUIConfigSync();
    return {
      config: syncResult.config,
      error: syncResult.error,
      source: syncResult.source,
    };
  });

  const loadConfig = () => {
    const result = loadWebUIConfigSync();
    setConfigState({
      config: result.config,
      error: result.error,
      source: result.source,
    });
  };


  useEffect(() => {
    const handleConfigChange = () => {
      loadConfig();
    };

    // Listen for custom event that might be fired when config changes
    window.addEventListener('webui-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('webui-config-changed', handleConfigChange);
    };
  }, []);

  const contextValue: WebUIConfigContext = {
    config: configState.config,
    error: configState.error,
    source: configState.source,
    reload: loadConfig,
  };

  return <WebUIConfigContext.Provider value={contextValue}>{children}</WebUIConfigContext.Provider>;
}

/**
 * Hook to access WebUI configuration
 */
export function useWebUIConfig(): WebUIConfigContext {
  const context = useContext(WebUIConfigContext);

  if (!context) {
    throw new Error('useWebUIConfig must be used within a WebUIConfigProvider');
  }

  return context;
}

/**
 * Hook to access configuration value directly
 */
export function useWebUIConfigValue(): BaseAgentWebUIImplementation {
  const { config } = useWebUIConfig();
  return config;
}

/**
 * HOC to provide WebUI config to components
 */
export function withWebUIConfig<P extends object>(
  Component: React.ComponentType<P & { webuiConfig: BaseAgentWebUIImplementation }>,
) {
  return function WithWebUIConfigComponent(props: P) {
    const config = useWebUIConfigValue();
    return <Component {...props} webuiConfig={config} />;
  };
}

/**
 * Utility function to trigger config reload from outside React
 */
export function triggerConfigReload() {
  window.dispatchEvent(new CustomEvent('webui-config-changed'));
}
