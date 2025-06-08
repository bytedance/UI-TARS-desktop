/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentEventStream } from '@agent-tars/core';
import { SessionMetadata } from '../storage';

/**
 * ShareUtils - Utility functions for sharing session data
 *
 * Provides methods for:
 * - Generating HTML for sharing
 * - Uploading share HTML to providers
 */
export class ShareUtils {
  /**
   * Generate shareable HTML content for a session
   * @param events Session events to include
   * @param metadata Session metadata
   * @param staticPath Path to static web UI files
   * @param modelInfo Model information to include
   * @returns Generated HTML content
   */
  static generateShareHtml(
    events: AgentEventStream.Event[],
    metadata: SessionMetadata,
    staticPath: string,
    modelInfo: { provider: string; model: string },
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

      // Inject session data and event stream
      const scriptTag = `<script>
        window.AGENT_TARS_REPLAY_MODE = true;
        window.AGENT_TARS_SESSION_DATA = ${JSON.stringify(metadata)};
        window.AGENT_TARS_EVENT_STREAM = ${JSON.stringify(events)};
        window.AGENT_TARS_MODEL_INFO = ${JSON.stringify(modelInfo)};
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
      metadata?: SessionMetadata;

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
        if (options.metadata) {
          formData.append('name', options.metadata.name || '');
          // Add tags if available
          if (options.metadata.tags && options.metadata.tags.length > 0) {
            formData.append('tags', JSON.stringify(options.metadata.tags));
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
}
