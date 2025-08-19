/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, CODE_ENVIRONMENT } from '@omni-tars/core';
import { LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';
import { ExcuteBashProvider } from './tools/ExcuteBash';
import { JupyterCIProvider } from './tools/JupyterCI';
import { StrReplaceEditorProvider } from './tools/StrReplaceEditor';
import { AioClient } from '@agent-infra/sandbox';
import assert from 'assert';

/**
 * Code Agent Plugin - handles CODE_ENVIRONMENT for bash, file editing, and Jupyter execution
 */
export class CodeAgentPlugin extends AgentPlugin {
  readonly name = 'code-agent-plugin';
  readonly environmentSection = CODE_ENVIRONMENT;
  private client: AioClient;

  constructor() {
    super();

    assert(process.env.AIO_SANDBOX_URL, 'no AIO_SANDBOX_URL url providered.');

    this.client = new AioClient({
      baseUrl: process.env.AIO_SANDBOX_URL,
    });

    // Initialize tools
    this.tools = [
      new ExcuteBashProvider(this.client).getTool(),
      new JupyterCIProvider(this.client).getTool(),
      new StrReplaceEditorProvider(this.client).getTool(),
    ];

    this.checkSandbox();
  }

  async checkSandbox() {
    await this.client.healthCheck();
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
