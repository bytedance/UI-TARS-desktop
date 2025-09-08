/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentEventStream, AgentServerVersionInfo } from '@tarko/interface';
import { AgentUIBuilder, createShareProviderProcessor } from '@tarko/agent-ui-builder';
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

    // Use the share provider processor from agent-ui-builder
    const processor = createShareProviderProcessor(
      shareProviderUrl,
      sessionId,
      {
        slug: options?.slug,
        query: options?.query,
      },
    );

    // Execute the processor with the HTML and metadata
    const result = await processor(
      html,
      options?.sessionItemInfo || {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspace: '',
      },
    );

    if (!result) {
      throw new Error('Failed to upload to share provider');
    }

    return result;
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
