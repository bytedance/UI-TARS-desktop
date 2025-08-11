/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin } from '../AgentPlugin';
import { LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SnapshotPluginConfigOption {
  baseDir: string;
}

/**
 * MCP Agent Plugin - handles MCP_ENVIRONMENT and provides search/link reading capabilities
 */
export class SnapshotPlugin extends AgentPlugin {
  private baseDir = '';
  private loop = 0;
  readonly name = 'snapshot-plugin';

  constructor(option: SnapshotPluginConfigOption) {
    super();
    this.baseDir = option.baseDir;
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    this.saveSnapshot(id, 'request.json', payload);
  }

  async onLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    this.saveSnapshot(id, 'response.json', payload);
  }

  async onEachAgentLoopStart(): Promise<void> {
    this.loop++;
  }

  async onAgentLoopEnd(): Promise<void> {
    this.loop++;
    return Promise.resolve();
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
      const dir = join(this.baseDir, `${id}/loop-${this.loop}`);

      this.ensureDirectoryExists(dir);

      const filePath = join(dir, filename);
      const content = JSON.stringify(payload, null, 2);

      writeFileSync(filePath, content, { encoding: 'utf-8' });

      //   this.logger.debug(`Snapshot saved: ${filePath}`);
    } catch (error) {
      console.error('saveSnapshot err: ', error);
      //   this.logger.error(`Failed to save snapshot for ${id}/${filename}:`, error);
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
