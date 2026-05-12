/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { AgentAppConfig } from '@tarko/interface';
import { parseMCPJsonConfig } from '@agent-infra/shared';

/**
 * Workspace configuration file paths
 */
export const WORKSPACE_CONFIG_PATHS = {
  INSTRUCTIONS: '.tarko/instructions.md',
  MCP_CONFIG: '.tarko/mcp.json',
  // Future: RULES: '.tarko/rules/*.md',
} as const;

/**
 * Load workspace configuration from .tarko directory
 */
export function loadWorkspaceConfig(workspacePath: string): Partial<AgentAppConfig> {
  const config: Partial<AgentAppConfig> = {};

  // Load instructions.md if exists
  const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
  if (fs.existsSync(instructionsPath)) {
    try {
      const instructions = fs.readFileSync(instructionsPath, 'utf-8').trim();
      if (instructions) {
        config.instructions = instructions;
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to read ${instructionsPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Load mcp.json if exists (standard MCP JSON config format)
  const mcpConfigPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.MCP_CONFIG);
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const mcpJsonText = fs.readFileSync(mcpConfigPath, 'utf-8').trim();
      if (mcpJsonText) {
        const result = parseMCPJsonConfig(mcpJsonText);
        if (result.errors.length > 0) {
          console.warn(
            `Warning: MCP config parse errors in ${mcpConfigPath}: ${result.errors.join('; ')}`,
          );
        }
        if (result.servers.length > 0) {
          if (!config.mcpServers) {
            config.mcpServers = {};
          }
          for (const server of result.servers) {
            const { id, name, ...serverConfig } = server as any;
            config.mcpServers[name] = serverConfig;
          }
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to read ${mcpConfigPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return config;
}

/**
 * Check if workspace has any .tarko configuration files
 */
export function hasWorkspaceConfig(workspacePath: string): boolean {
  const tarkoDir = path.join(workspacePath, '.tarko');
  if (!fs.existsSync(tarkoDir)) {
    return false;
  }

  const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
  const mcpConfigPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.MCP_CONFIG);
  return fs.existsSync(instructionsPath) || fs.existsSync(mcpConfigPath);
}
