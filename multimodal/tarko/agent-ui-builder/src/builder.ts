/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import type { AgentUIBuilderInputOptions, UploadOptions } from './types';
import { getStaticPath } from './static-path';

/**
 * Agent UI Builder - Simple class for generating and uploading replay HTML
 */
export class AgentUIBuilder {
  private input: AgentUIBuilderInputOptions;

  constructor(input: AgentUIBuilderInputOptions) {
    this.input = input;
  }

  /**
   * Generate HTML and optionally save to file
   * @param filePath Optional file path to save HTML
   * @returns Generated HTML string
   */
  public dump(filePath?: string): string {
    const { events, sessionInfo, staticPath: customStaticPath, serverInfo, uiConfig } = this.input;

    // Use provided static path or fallback to built-in static files
    const staticPath = customStaticPath || getStaticPath();

    const indexPath = path.join(staticPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Static web UI not found at: ${indexPath}`);
    }

    try {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      const safeEventJson = AgentUIBuilder.safeJsonStringify(events);
      const safeSessionInfoJson = AgentUIBuilder.safeJsonStringify(sessionInfo);
      const safeVersionJson = serverInfo ? AgentUIBuilder.safeJsonStringify(serverInfo) : null;
      const safeUIConfigJson = uiConfig ? AgentUIBuilder.safeJsonStringify(uiConfig) : null;

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

      // Save to file if path provided
      if (filePath) {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write HTML to file
        fs.writeFileSync(filePath, htmlContent, 'utf8');
      }

      return htmlContent;
    } catch (error) {
      console.error('Failed to generate HTML:', error);
      throw new Error(
        `Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Upload HTML to share provider
   * @param html HTML content to upload
   * @param shareProviderUrl URL of the share provider
   * @param options Upload options
   * @returns Share URL
   */
  public async upload(
    html: string,
    shareProviderUrl: string,
    options?: UploadOptions,
  ): Promise<string> {
    const sessionId = this.input.sessionInfo.id;

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
    const sessionInfo = this.input.sessionInfo;
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
