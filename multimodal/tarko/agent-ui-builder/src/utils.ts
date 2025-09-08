/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import os from 'os';
import { AgentUIBuilder } from './builder';
import {
  AgentUIBuilderInputOptions,
  AgentUIBuilderResult,
  PostProcessor,
} from './types';

/**
 * Convenience function to build HTML and return it in memory
 */
export async function buildHTMLInMemory(
  input: AgentUIBuilderInputOptions,
): Promise<AgentUIBuilderResult> {
  return AgentUIBuilder.build({
    input,
    output: {
      destination: 'memory',
    },
  });
}

/**
 * Convenience function to build HTML and write it to a file
 */
export async function buildHTMLToFile(
  input: AgentUIBuilderInputOptions,
  filePath: string,
  overwrite = false,
): Promise<AgentUIBuilderResult> {
  return AgentUIBuilder.build({
    input,
    output: {
      destination: 'file',
      fileSystem: {
        filePath,
        overwrite,
      },
    },
  });
}

/**
 * Convenience function to build HTML with a custom post-processor
 */
export async function buildHTMLWithProcessor(
  input: AgentUIBuilderInputOptions,
  postProcessor: PostProcessor,
): Promise<AgentUIBuilderResult> {
  return AgentUIBuilder.build({
    input,
    output: {
      destination: 'custom',
      postProcessor,
    },
  });
}

/**
 * Generate a default file path for HTML output
 */
export function generateDefaultFilePath(sessionId: string, prefix = 'agent-replay'): string {
  const timestamp = Date.now();
  const fileName = `${prefix}-${sessionId}-${timestamp}.html`;
  return path.join(os.tmpdir(), 'agent-ui-builder', fileName);
}

/**
 * Create a post-processor that uploads to a share provider
 * This is compatible with the existing ShareUtils.uploadShareHtml pattern
 */
export function createShareProviderProcessor(
  shareProviderUrl: string,
  sessionId: string,
  options?: {
    slug?: string;
    query?: string;
  },
): PostProcessor {
  return async (html, metadata) => {
    // Create form data using native FormData
    const formData = new FormData();
    
    // Create a File object from the HTML content
    const fileName = `agent-replay-${sessionId}-${Date.now()}.html`;
    const file = new File([html], fileName, { type: 'text/html' });
    
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    formData.append('type', 'html');
    
    // Add additional metadata fields if provided
    if (options?.slug) {
      formData.append('slug', options.slug);
    }
    
    if (options?.query) {
      formData.append('query', options.query);
    }
    
    // Add session metadata fields
    if (metadata.metadata?.name) {
      formData.append('name', metadata.metadata.name);
    }
    
    if (metadata.metadata?.tags && metadata.metadata.tags.length > 0) {
      const tagsJson = JSON.stringify(metadata.metadata.tags);
      formData.append('tags', tagsJson);
    }
    
    try {
      // Send request to share provider using fetch
      const response = await fetch(shareProviderUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Return share URL with replay parameter
      if (responseData && responseData.url) {
        const url = new URL(responseData.url);
        url.searchParams.set('replay', '1');
        return url.toString();
      }
      
      throw new Error('Invalid response from share provider');
    } catch (error) {
      console.error('Failed to upload to share provider:', error);
      throw error;
    }
  };
}
