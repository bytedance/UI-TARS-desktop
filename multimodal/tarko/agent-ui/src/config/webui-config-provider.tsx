/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BaseAgentWebUIImplementation } from '@tarko/interface';
import { loadWebUIConfigSync, type ConfigLoadResult } from './config-loader';

interface WebUIConfigContext {
  config: BaseAgentWebUIImplementation;
  error?: string;
  source: ConfigLoadResult['source'];
}

const WebUIConfigContext = createContext<WebUIConfigContext | null>(null);

interface WebUIConfigProviderProps {
  children: ReactNode;
}

export function WebUIConfigProvider({ children }: WebUIConfigProviderProps) {
  const [configState, setConfigState] = useState<{
    config: BaseAgentWebUIImplementation;
    error?: string;
    source: ConfigLoadResult['source'];
  }>(() => {
    const syncResult = loadWebUIConfigSync();

    return {
      config: syncResult.config,
      source: syncResult.source,
    };
  });

  const contextValue: WebUIConfigContext = {
    config: configState.config,
    error: configState.error,
    source: configState.source,
  };

  return <WebUIConfigContext.Provider value={contextValue}>{children}</WebUIConfigContext.Provider>;
}
