import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import FormData from 'form-data';
import { Event } from '@agent-tars/core';
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
    events: Event[],
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
   * @returns URL of the shared content
   */
  static async uploadShareHtml(
    html: string,
    sessionId: string,
    shareProviderUrl: string,
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

      // Create form data
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('sessionId', sessionId);

      // Send request to share provider
      const response = await axios.post(shareProviderUrl, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clean up temporary file
      fs.unlinkSync(filePath);

      // Return share URL
      if (response.data && response.data.url) {
        return response.data.url;
      }

      throw new Error('Invalid response from share provider');
    } catch (error) {
      console.error('Failed to upload share HTML:', error);
      throw error;
    }
  }
}
