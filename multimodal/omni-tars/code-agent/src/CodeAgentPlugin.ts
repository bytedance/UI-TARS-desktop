/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, CODE_ENVIRONMENT } from '@omni-tars/core';
import { Tool, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';
import { McpManager } from './tools/mcp';
import { MCPServer } from '@agent-infra/mcp-client';
import { ExcuteBashProvider } from './tools/ExcuteBash';
import { JupyterCIProvider } from './tools/JupyterCI';
import { StrReplaceEditorProvider } from './tools/StrReplaceEditor';

export interface CodeAgentPluginOption {
  mcpServers: MCPServer[];
}

/**
 * Code Agent Plugin - handles CODE_ENVIRONMENT for bash, file editing, and Jupyter execution
 */
export class CodeAgentPlugin extends AgentPlugin {
  readonly name = 'code-agent-plugin';
  readonly environmentSection = CODE_ENVIRONMENT;

  private mcpManager: McpManager;

  constructor(config: CodeAgentPluginOption) {
    super();
    this.mcpManager = new McpManager({
      mcpServers: config.mcpServers,
    });
  }

  async initialize(): Promise<void> {
    await this.mcpManager.init();

    // Initialize tools
    this.tools = [
      new ExcuteBashProvider(this.mcpManager).getTool(),
      new JupyterCIProvider(this.mcpManager).getTool(),
      new StrReplaceEditorProvider(this.mcpManager).getTool(),
    ];
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // Code-specific request handling if needed
  }

  async onLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    // Code-specific response handling if needed
  }

  async onEachAgentLoopStart(): Promise<void> {
    // Code-specific loop start handling if needed
  }

  async onAgentLoopEnd(): Promise<void> {
    // Code-specific loop end handling if needed
  }
}
