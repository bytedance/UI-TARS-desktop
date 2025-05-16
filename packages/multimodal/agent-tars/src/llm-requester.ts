/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { getLLMClient, ModelResolver, ResolvedModel, getLogger } from '@multimodal/agent';

const logger = getLogger('LLMRequester');

/**
 * Options for LLM request
 */
export interface LLMRequestOptions {
  /**
   * Provider name
   */
  provider: string;
  /**
   * Model name
   */
  model: string;
  /**
   * Path to the request body JSON file or JSON string
   */
  body: string;
  /**
   * API key (optional)
   */
  apiKey?: string;
  /**
   * Base URL (optional)
   */
  baseURL?: string;
  /**
   * Whether to use streaming mode
   */
  stream?: boolean;
  /**
   * Whether to use thinking mode
   */
  thinking?: boolean;
}

/**
 * A standalone module to send requests to LLM providers without creating a full Agent
 */
export class LLMRequester {
  /**
   * Send a request to LLM provider
   */
  async request(options: LLMRequestOptions): Promise<any> {
    const { provider, model, body, apiKey, baseURL, stream = false } = options;

    const modelResolver = new ModelResolver({
      model: {
        use: {
          provider: provider as ResolvedModel['provider'],
          model,
          baseURL,
          apiKey,
        },
      },
    });

    const resolvedModel = modelResolver.resolve();

    // Get request body
    const requestBody = this.getRequestBody(body);
    if (!requestBody) {
      throw new Error('Invalid request body');
    }

    logger.info(`Sending request to ${provider}/${model}`);
    if (baseURL) {
      logger.info(`Using custom baseURL: ${baseURL}`);
    }

    // Create LLM client
    const client = getLLMClient(resolvedModel, { type: options.thinking ? 'enabled' : 'disabled' });

    try {
      // Add stream option to request
      requestBody.stream = stream;

      // Send request
      const response = await client.chat.completions.create(requestBody);

      if (stream) {
        // Return the stream directly
        return response;
      } else {
        // Return complete response
        return response;
      }
    } catch (error) {
      logger.error(`Request failed: ${error}`);
      throw error;
    }
  }

  /**
   * Parse the request body from a file path or JSON string
   */
  private getRequestBody(body: string): any {
    try {
      // Check if body is a file path
      if ((body.endsWith('.json') || body.endsWith('.jsonl')) && fs.existsSync(body)) {
        const content = fs.readFileSync(body, 'utf-8');
        return JSON.parse(content);
      }

      // Check if body is a JSON string
      try {
        return JSON.parse(body);
      } catch (e) {
        // Not a valid JSON string
        logger.error(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
        return null;
      }
    } catch (error) {
      logger.error(
        `Failed to parse request body: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }
}
