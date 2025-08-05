/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Agent,
  AgentOptions,
  getLogger,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
} from '@tarko/agent';
import { SYSTEM_PROMPT } from './prompt';
import { SeedMCPAgentToolCallEngine } from './SeedMCPAgentToolCallEngine';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { McpManager } from './tools/mcp';

export interface SeedMcpAgentOption extends AgentOptions {
  googleApiKey: string;
  tavilyApiKey: string;
}

export default class SeedMcpAgent extends Agent {
  static label = 'seed-mcp-agent';
  private loop = 0;
  private _options: SeedMcpAgentOption;
  constructor(options: SeedMcpAgentOption) {
    super({
      name: 'Seed MCP Agent',
      instructions: SYSTEM_PROMPT,
      toolCallEngine: SeedMCPAgentToolCallEngine,
      maxIterations: 100,
      ...options,
    });
    this._options = options;
    this.logger = getLogger('SeedMCPAgent');
  }

  async initialize(): Promise<void> {
    const mcpManager = new McpManager({
      tavilyApiKey: this._options.tavilyApiKey,
      googleApiKey: this._options.googleApiKey,
    });

    await mcpManager.init();

    this.registerTool(new SearchToolProvider(mcpManager).getTool());
    this.registerTool(new LinkReaderToolProvider(mcpManager).getTool());
    await super.initialize();
  }

  onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    this.saveSnapshot(id, 'request.json', payload);
  }

  onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    this.saveSnapshot(id, 'response.json', payload);
  }

  onAgentLoopEnd(): Promise<void> {
    this.loop++;
    return Promise.resolve();
  }

  onEachAgentLoopStart(): void | Promise<void> {
    this.loop++;
  }

  /**
   * Saves snapshot data to the file system.
   * @param id The session ID.
   * @param filename The filename.
   * @param payload The data to save.
   */
  private saveSnapshot(
    id: string,
    filename: string,
    payload: LLMRequestHookPayload | LLMResponseHookPayload,
  ): void {
    try {
      const dir = join(__dirname, `../snapshot/${id}/loop-${this.loop}`);

      this.ensureDirectoryExists(dir);

      const filePath = join(dir, filename);
      const content = JSON.stringify(payload, null, 2);

      writeFileSync(filePath, content, { encoding: 'utf-8' });

      this.logger.debug(`Snapshot saved: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save snapshot for ${id}/${filename}:`, error);
    }
  }

  /**
   * Ensures that a directory exists, creating it if it doesn't.
   * @param dir The directory path.
   */
  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
