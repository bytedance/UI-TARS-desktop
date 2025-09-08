/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AgentUIBuilderOptions,
  AgentUIBuilderResult,
  AgentUIBuilderInputOptions,
  AgentUIBuilderOutputOptions,
  PostProcessor,
} from './types';
import { getStaticPath } from './static-path';
import type { SessionItemInfo } from '@tarko/interface';

/**
 * Agent UI Builder - Core class for generating replay HTML files
 *
 * Provides functionality to build HTML files from agent session data
 * with support for multiple output destinations and post-processing.
 */
export class AgentUIBuilder {
  /**
   * Generate shareable HTML content for a session
   * Based on ShareUtils.generateShareHtml but extracted for reuse
   */
  static generateHTML(input: AgentUIBuilderInputOptions): string {
    const { events, sessionInfo, staticPath: customStaticPath, serverInfo, uiConfig } = input;

    // Use provided static path or fallback to built-in static files
    const staticPath = customStaticPath || getStaticPath();

    const indexPath = path.join(staticPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Static web UI not found at: ${indexPath}`);
    }

    try {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      const safeEventJson = this.safeJsonStringify(events);
      const safeSessionInfoJson = this.safeJsonStringify(sessionInfo);
      const safeVersionJson = serverInfo ? this.safeJsonStringify(serverInfo) : null;
      const safeUIConfigJson = uiConfig ? this.safeJsonStringify(uiConfig) : null;

      // Inject session data, event stream, version info, and web UI config
      const scriptTag = `<script>
        window.AGENT_REPLAY_MODE = true;
        window.AGENT_SESSION_DATA = ${safeSessionInfoJson};
        window.AGENT_EVENT_STREAM = ${safeEventJson};${
          safeVersionJson ? `\n        window.AGENT_VERSION_INFO = ${safeVersionJson};` : ''
        }${safeUIConfigJson ? `\n        window.AGENT_WEB_UI_CONFIG = ${safeUIConfigJson};` : ''}
      </script>
      <script>
        // Add a fallback mechanism for when routes don't match in shared HTML files
        window.addEventListener('DOMContentLoaded', function() {
          // Give React time to attempt normal routing
          setTimeout(function() {
            const root = document.getElementById('root');
            if (root && (!root.children || root.children.length === 0)) {
              console.log('[ReplayMode] No content rendered, applying fallback');
              // Try to force the app to re-render if no content is displayed
              window.dispatchEvent(new Event('resize'));
            }
          }, 1000);
        });
      </script>`;

      // Insert script before the head end tag
      htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);

      return htmlContent;
    } catch (error) {
      console.error('Failed to generate HTML:', error);
      throw new Error(
        `Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build agent UI replay HTML with specified options
   */
  static async build(options: AgentUIBuilderOptions): Promise<AgentUIBuilderResult> {
    const { input, output } = options;

    // Generate HTML content
    const html = this.generateHTML(input);
    const timestamp = Date.now();
    const size = Buffer.byteLength(html, 'utf8');
    const eventCount = input.events.length;

    const result: AgentUIBuilderResult = {
      html,
      metadata: {
        size,
        timestamp,
        eventCount,
      },
    };

    // Handle different output destinations
    switch (output.destination) {
      case 'memory':
        // HTML is already in result, nothing more to do
        break;

      case 'file':
        if (!output.fileSystem) {
          throw new Error('File system options are required when destination is "file"');
        }

        const { filePath, overwrite = false } = output.fileSystem;

        // Check if file exists and overwrite is false
        if (!overwrite && fs.existsSync(filePath)) {
          throw new Error(`File already exists: ${filePath}. Set overwrite to true to replace it.`);
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write HTML to file
        fs.writeFileSync(filePath, html, 'utf8');
        result.filePath = filePath;
        break;

      case 'custom':
        if (!output.postProcessor) {
          throw new Error('Post-processor function is required when destination is "custom"');
        }

        const customResult = await output.postProcessor(html, input.sessionInfo);
        if (customResult !== undefined) {
          result.customResult = customResult;
        }
        break;

      default:
        throw new Error(`Unsupported output destination: ${(output as any).destination}`);
    }

    return result;
  }

  /**
   * Build HTML with specified input and output options
   * This is the unified API that replaces buildInMemory, buildToFile, and buildWithProcessor
   */
  static async buildHTML(
    input: AgentUIBuilderInputOptions,
    output?: AgentUIBuilderOutputOptions,
  ): Promise<AgentUIBuilderResult> {
    // Default to memory output if no output specified
    const defaultOutput: AgentUIBuilderOutputOptions = {
      destination: 'memory',
    };

    return this.build({
      input,
      output: output || defaultOutput,
    });
  }

  /**
   * Generate a default file path for HTML output
   */
  static generateDefaultFilePath(sessionId: string, prefix = 'agent-replay'): string {
    const timestamp = Date.now();
    const fileName = `${prefix}-${sessionId}-${timestamp}.html`;
    return path.join(os.tmpdir(), 'agent-ui-builder', fileName);
  }

  /**
   * Create a post-processor that uploads to a share provider
   * This is compatible with the existing ShareUtils.uploadShareHtml pattern
   */
  static createShareProviderProcessor(
    shareProviderUrl: string,
    sessionId: string,
    options?: {
      slug?: string;
      query?: string;
    },
  ): PostProcessor {
    return async (html, sessionInfo) => {
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
      if (sessionInfo.metadata?.name) {
        formData.append('name', sessionInfo.metadata.name);
      }

      if (sessionInfo.metadata?.tags && sessionInfo.metadata.tags.length > 0) {
        const tagsJson = JSON.stringify(sessionInfo.metadata.tags);
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

  /**
   * Safely stringify JSON data containing HTML content
   * This ensures HTML in the data won't break the embedding script
   */
  private static safeJsonStringify(data: object): string {
    let jsonString = JSON.stringify(data);

    // Escape all characters that may destroy the HTML structure
    // 1. Escape all angle brackets to prevent any HTML tags from being parsed by the browser
    jsonString = jsonString.replace(/</g, '\\u003C');
    jsonString = jsonString.replace(/>/g, '\\u003E');

    // 2. Escape other potentially dangerous characters
    jsonString = jsonString.replace(/\//g, '\\/'); // Escape slashes to prevent closing tags such as </script>

    return jsonString;
  }
}
