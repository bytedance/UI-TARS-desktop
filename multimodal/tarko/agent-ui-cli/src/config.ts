/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { loadConfig } from '@tarko/config-loader';
import { SessionInfo } from '@tarko/interface';
import { AguiConfig } from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<AguiConfig> = {
  sessionInfo: {
    id: 'cli-session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspace: process.cwd(),
    metadata: {
      name: 'AGUI CLI Generated Report',
      tags: [],
      modelConfig: {
        provider: 'unknown',
        modelId: 'unknown',
        displayName: 'Unknown Model',
        configuredAt: Date.now(),
      },
      agentInfo: {
        name: 'Agent',
        configuredAt: Date.now(),
      },
    },
  },
  serverInfo: {
    version: '1.0.0',
    buildTime: Date.now(),
    gitHash: 'unknown',
  },
  uiConfig: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'Agent UI',
    subtitle: 'Agent execution replay',
    welcomTitle: 'Agent Replay',
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
};

/**
 * Load AGUI configuration from file
 */
export async function loadAguiConfig(configPath?: string): Promise<AguiConfig> {
  let userConfig: Partial<AguiConfig> = {};

  if (configPath) {
    const absolutePath = path.resolve(configPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    try {
      const result = await loadConfig<AguiConfig>({ path: absolutePath });
      userConfig = result.content;
    } catch (error) {
      throw new Error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    const defaultConfigPaths = ['agui.config.ts', 'agui.config.js', 'agui.config.json'];

    for (const defaultPath of defaultConfigPaths) {
      const absolutePath = path.resolve(defaultPath);
      if (fs.existsSync(absolutePath)) {
        try {
          const result = await loadConfig<AguiConfig>({ path: absolutePath });
          userConfig = result.content;
          break;
        } catch (error) {
          console.warn(
            `Failed to load ${defaultPath}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  }

  return mergeConfig(DEFAULT_CONFIG, userConfig);
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(
  defaultConfig: Partial<AguiConfig>,
  userConfig: Partial<AguiConfig>,
): AguiConfig {
  const merged = { ...defaultConfig };

  for (const [key, value] of Object.entries(userConfig)) {
    if (value !== undefined) {
      if (key === 'events') {
        merged[key as keyof AguiConfig] = value as any;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key as keyof AguiConfig] = {
          ...((merged[key as keyof AguiConfig] as object) || {}),
          ...value,
        } as any;
      } else {
        merged[key as keyof AguiConfig] = value as any;
      }
    }
  }

  return merged as AguiConfig;
}

/**
 * Validate and normalize session info
 */
export function normalizeSessionInfo(sessionInfo: any): SessionInfo {
  const now = Date.now();

  return {
    id: sessionInfo.id || `cli-session-${now}`,
    createdAt: sessionInfo.createdAt || now,
    updatedAt: sessionInfo.updatedAt || now,
    workspace: sessionInfo.workspace || process.cwd(),
    metadata: {
      name: sessionInfo.metadata?.name || 'AGUI CLI Generated Report',
      tags: sessionInfo.metadata?.tags || [],
      modelConfig: {
        provider: sessionInfo.metadata?.modelConfig?.provider || 'unknown',
        modelId: sessionInfo.metadata?.modelConfig?.modelId || 'unknown',
        displayName: sessionInfo.metadata?.modelConfig?.displayName || 'Unknown Model',
        configuredAt: sessionInfo.metadata?.modelConfig?.configuredAt || now,
      },
      agentInfo: {
        name: sessionInfo.metadata?.agentInfo?.name || 'Agent',
        configuredAt: sessionInfo.metadata?.agentInfo?.configuredAt || now,
      },
    },
  };
}
