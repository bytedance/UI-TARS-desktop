/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  AgentUIBuilderOptions,
  AgentUIBuilderResult,
  AgentUIBuilderInputOptions,
  AgentUIBuilderOutputOptions,
} from './types';

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
    const { events, metadata, staticPath, serverInfo, webUIConfig } = input;

    if (!staticPath) {
      throw new Error('Static path is required for HTML generation');
    }

    const indexPath = path.join(staticPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Static web UI not found at: ${indexPath}`);
    }

    try {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      const safeEventJson = this.safeJsonStringify(events);
      const safeMetadataJson = this.safeJsonStringify(metadata);
      const safeVersionJson = serverInfo ? this.safeJsonStringify(serverInfo) : null;
      const safeWebUIConfigJson = webUIConfig ? this.safeJsonStringify(webUIConfig) : null;

      // Inject session data, event stream, version info, and web UI config
      const scriptTag = `<script>
        window.AGENT_REPLAY_MODE = true;
        window.AGENT_SESSION_DATA = ${safeMetadataJson};
        window.AGENT_EVENT_STREAM = ${safeEventJson};${
          safeVersionJson ? `\n        window.AGENT_VERSION_INFO = ${safeVersionJson};` : ''
        }${
          safeWebUIConfigJson
            ? `\n        window.AGENT_WEB_UI_CONFIG = ${safeWebUIConfigJson};`
            : ''
        }
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

        const customResult = await output.postProcessor(html, input.metadata);
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
