/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentEventStream, AgentServerVersionInfo } from '@tarko/interface';
import { SessionItemInfo } from '../storage';

/**
 * ShareUtils - Utility functions for sharing session data
 *
 * Provides methods for:
 * - Generating HTML for sharing
 * - Uploading share HTML to providers
 * - Uploading individual files to share providers
 */
export class ShareUtils {
  /**
   * Generate shareable HTML content for a session
   * @param events Session events to include
   * @param metadata Session metadata
   * @param staticPath Path to static web UI files
   * @param serverInfo Optional server version info
   * @returns Generated HTML content
   */
  static generateShareHtml(
    events: AgentEventStream.Event[],
    metadata: SessionItemInfo,
    staticPath: string,
    serverInfo?: AgentServerVersionInfo,
  ): string {
    if (!staticPath) {
      throw new Error('Cannot found static path.');
    }

    const indexPath = path.join(staticPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('Static web ui not found.');
    }

    try {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      const safeEventJson = this.safeJsonStringify(events);
      const safeMetadataJson = this.safeJsonStringify(metadata);
      const safeVersionJson = serverInfo ? this.safeJsonStringify(serverInfo) : null;

      // Inject session data, event stream, and version info
      const scriptTag = `<script>
        window.AGENT_REPLAY_MODE = true;
        window.AGENT_SESSION_DATA = ${safeMetadataJson};
        window.AGENT_EVENT_STREAM = ${safeEventJson};${
          safeVersionJson
            ? `
        window.AGENT_VERSION_INFO = ${safeVersionJson};`
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
      console.error('Failed to generate share HTML:', error);
      throw new Error(
        `Failed to generate share HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Safely stringify JSON data containing HTML content
   * This ensures HTML in the data won't break the embedding script
   * @param data The data to stringify
   * @returns Safe JSON string
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

  /**
   * Upload HTML to a share provider
   * @param html HTML content to upload
   * @param sessionId Session ID
   * @param shareProviderUrl URL of the share provider
   * @param options Additional share metadata options
   * @returns URL of the shared content
   */
  static async uploadShareHtml(
    html: string,
    sessionId: string,
    shareProviderUrl: string,
    options?: {
      /**
       * Session metadata containing additional session information
       */
      sessionItemInfo?: SessionItemInfo;

      /**
       * Normalized slug for semantic URLs, derived from user query
       */
      slug?: string;

      /**
       * Original query that initiated the conversation
       */
      query?: string;
    },
  ): Promise<string> {
    if (!shareProviderUrl) {
      throw new Error('Share provider not configured');
    }

    try {
      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), 'agent-tars-share');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `agent-tars-${sessionId}-${Date.now()}.html`;
      const filePath = path.join(tempDir, fileName);

      // Write HTML content to temporary file
      fs.writeFileSync(filePath, html);

      // Create form data using native FormData
      const formData = new FormData();

      // Create a File object from the HTML content
      const file = new File([html], fileName, { type: 'text/html' });
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('type', 'html'); // Specify this is HTML content

      // Add additional metadata fields if provided
      if (options) {
        // Add normalized slug for semantic URLs
        if (options.slug) {
          formData.append('slug', options.slug);
        }

        // Add original query
        if (options.query) {
          formData.append('query', options.query);
        }

        // Add session metadata fields
        if (options.sessionItemInfo) {
          formData.append('name', options.sessionItemInfo.metadata?.name || '');
          // Add tags if available
          if (
            options.sessionItemInfo.metadata?.tags &&
            options.sessionItemInfo.metadata.tags.length > 0
          ) {
            formData.append('tags', JSON.stringify(options.sessionItemInfo.metadata.tags));
          }
        }
      }

      // Send request to share provider using fetch
      const response = await fetch(shareProviderUrl, {
        method: 'POST',
        body: formData,
      });

      // Clean up temporary file
      fs.unlinkSync(filePath);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // Return share URL
      if (responseData && responseData.url) {
        return responseData.url;
      }

      throw new Error('Invalid response from share provider');
    } catch (error) {
      console.error('Failed to upload share HTML:', error);
      throw error;
    }
  }

  /**
   * Upload a file to share provider
   * @param filePath Path to the file to upload
   * @param fileName Name for the uploaded file
   * @param shareProviderUrl URL of the share provider
   * @param options Additional upload options
   * @returns URL of the uploaded file
   */
  static async uploadFile(
    filePath: string,
    fileName: string,
    shareProviderUrl: string,
    options?: {
      /**
       * File type (e.g., 'image', 'document')
       */
      type?: string;
      /**
       * Original relative path of the file
       */
      originalPath?: string;
      /**
       * Additional metadata
       */
      metadata?: Record<string, string>;
    },
  ): Promise<string> {
    if (!shareProviderUrl) {
      throw new Error('Share provider not configured');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const fileContent = fs.readFileSync(filePath);

      // Create form data using native FormData
      const formData = new FormData();

      // Create a File object from the file content
      const file = new File([fileContent], fileName, {
        type: this.getMimeType(filePath),
      });

      formData.append('file', file);
      formData.append('type', options?.type || 'file');

      if (options?.originalPath) {
        formData.append('originalPath', options.originalPath);
      }

      // Add additional metadata if provided
      if (options?.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          formData.append(key, value);
        }
      }

      // Send request to share provider using fetch
      const response = await fetch(shareProviderUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // Return file URL
      if (responseData && responseData.url) {
        return responseData.url;
      }

      throw new Error('Invalid response from share provider for file upload');
    } catch (error) {
      console.error(`Failed to upload file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get MIME type for a file based on its extension
   */
  private static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      // Documents
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      // Archives
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
