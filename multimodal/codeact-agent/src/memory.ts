/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Manages persistent memory storage within a workspace for Code Act tools.
 *
 * This allows the agent to maintain state between code executions
 * and store runtime information for multi-turn interactions.
 */
export class CodeActMemory {
  private memoryPath: string;
  private memoryData: Record<string, any> = {};
  private initialized = false;

  /**
   * Create a new memory manager for a specific workspace
   *
   * @param workspacePath Path to the workspace directory
   * @param memoryFileName Name of the memory file (defaults to .code_act_memory.json)
   */
  constructor(
    public readonly workspacePath: string,
    private memoryFileName: string = '.code_act_memory.json',
  ) {
    this.memoryPath = path.join(workspacePath, memoryFileName);
  }

  /**
   * Initialize the memory storage
   * Creates the workspace directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure workspace directory exists
      if (!fs.existsSync(this.workspacePath)) {
        logger.info(`Creating workspace directory: ${this.workspacePath}`);
        fs.mkdirSync(this.workspacePath, { recursive: true });
      }

      // Load existing memory if it exists
      if (fs.existsSync(this.memoryPath)) {
        const data = await fs.promises.readFile(this.memoryPath, 'utf-8');
        this.memoryData = JSON.parse(data);
        logger.info(`Loaded memory from ${this.memoryPath}`);
      } else {
        // Initialize with empty memory
        this.memoryData = {};
        await this.save();
        logger.info(`Initialized new memory at ${this.memoryPath}`);
      }

      this.initialized = true;
    } catch (error) {
      logger.error(`Error initializing memory: ${error}`);
      // Initialize with empty memory on error
      this.memoryData = {};
      this.initialized = true;
    }
  }

  /**
   * Save the current memory to disk
   */
  async save(): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.memoryPath,
        JSON.stringify(this.memoryData, null, 2),
        'utf-8',
      );
      logger.debug(`Memory saved to ${this.memoryPath}`);
    } catch (error) {
      logger.error(`Error saving memory: ${error}`);
    }
  }

  /**
   * Set a value in memory
   *
   * @param key The memory key
   * @param value The value to store
   */
  async set(key: string, value: any): Promise<void> {
    if (!this.initialized) await this.initialize();
    this.memoryData[key] = value;
    await this.save();
  }

  /**
   * Get a value from memory
   *
   * @param key The memory key
   * @param defaultValue Optional default value if key doesn't exist
   * @returns The stored value or defaultValue
   */
  async get(key: string, defaultValue?: any): Promise<any> {
    if (!this.initialized) await this.initialize();
    return key in this.memoryData ? this.memoryData[key] : defaultValue;
  }

  /**
   * Check if a key exists in memory
   *
   * @param key The memory key
   * @returns True if the key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    return key in this.memoryData;
  }

  /**
   * Delete a key from memory
   *
   * @param key The memory key
   * @returns True if the key was deleted
   */
  async delete(key: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    const exists = key in this.memoryData;
    if (exists) {
      delete this.memoryData[key];
      await this.save();
    }
    return exists;
  }

  /**
   * Get all memory data
   *
   * @returns Copy of the entire memory store
   */
  async getAll(): Promise<Record<string, any>> {
    if (!this.initialized) await this.initialize();
    return { ...this.memoryData };
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    this.memoryData = {};
    await this.save();
  }
}
