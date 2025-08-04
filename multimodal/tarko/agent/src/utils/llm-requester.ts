/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelResolver, ResolvedModel } from '@tarko/model-provider';
import { LLMRequestHookPayload } from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';
import { getLLMClient } from '../agent';
import fs from 'fs';

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
      provider: provider as ResolvedModel['provider'],
      id: model,
      baseURL,
      apiKey,
    });

    const resolvedModel = modelResolver.resolve();

    // Get request body
    const response = this.getRequestBody(body);
    const requestBody = response.request;

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
      // @ts-expect-error
      // Add stream option to request
      requestBody.stream = requestBody.stream ?? stream;

      // @ts-expect-error
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
  private getRequestBody(body: string): LLMRequestHookPayload {
    try {
      // Check if body is a file path
      if (body.endsWith('.json') || body.endsWith('.jsonl')) {
        if (fs.existsSync(body)) {
          const content = fs.readFileSync(body, 'utf-8');
          console.log('content', content);
          return JSON.parse(content);
        }
        throw new Error(`body does not exist: ${body}`);
      }

      // Check if body is a JSON string
      return JSON.parse(body);
    } catch (error) {
      throw new Error(
        `Failed to parse request body: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
