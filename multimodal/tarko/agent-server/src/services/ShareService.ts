/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { AgentEventStream, isAgentWebUIImplementationType } from '@tarko/interface';
import { SessionInfo, StorageProvider } from '../storage';
import { AgentUIBuilder } from '@tarko/agent-ui-builder';
import { SlugGenerator } from '../utils/slug-generator';
import fs from 'fs';
import path from 'path';
import { ensureHttps } from '../utils';
import { mergeWebUIConfig } from '../utils/webui';
import type { AgentServerVersionInfo, IAgent, AgentAppConfig } from '../types';
import type { AgentServer } from '../server';

/**
 * ShareService - Centralized service for handling session sharing
 *
 * Responsible for:
 * - Generating shareable HTML content
 * - Uploading shared content to providers
 * - Managing share metadata and slugs
 * - Processing and uploading workspace images
 */
export class ShareService {
  constructor(
    private appConfig: AgentAppConfig,
    private storageProvider: StorageProvider | null,
    private server?: AgentServer,
  ) {}

  /**
   * Share a session
   * @param sessionId Session ID to share
   * @param upload Whether to upload to share provider
   * @param agent Optional agent instance for slug generation
   * @param serverInfo Optional server version info
   * @returns Share result with URL or HTML content
   */
  async shareSession(
    sessionId: string,
    upload = false,
    agent?: IAgent,
    serverInfo?: AgentServerVersionInfo,
  ): Promise<{
    success: boolean;
    url?: string;
    html?: string;
    sessionId: string;
    error?: string;
  }> {
    try {
      // Verify storage is available
      if (!this.storageProvider) {
        throw new Error('Storage not configured, cannot share session');
      }

      // Get session metadata
      const metadata = await this.storageProvider.getSessionInfo(sessionId);
      if (!metadata) {
        throw new Error('Session not found');
      }

      // Get session events
      const events = await this.storageProvider.getSessionEvents(sessionId);

      // Filter key frame events, exclude streaming messages
      const keyFrameEvents = events.filter(
        (event) =>
          event.type !== 'assistant_streaming_message' &&
          event.type !== 'assistant_streaming_thinking_message' &&
          event.type !== 'final_answer_streaming',
      );

      // Generate HTML content with server options
      let processedEvents = keyFrameEvents;
      if (upload && this.appConfig.share?.provider) {
        // @ts-expect-error
        processedEvents = await this.processWorkspaceImages(keyFrameEvents, metadata.workspace);
      }

      // Generate HTML content
      if (!isAgentWebUIImplementationType(this.appConfig.webui!, 'static')) {
        throw new Error(`Unsupported web ui type: ${this.appConfig.webui!.type}`);
      }

      if (!this.appConfig.webui?.staticPath) {
        throw new Error('Cannot found static path.');
      }

      // Merge web UI config with agent constructor config
      const mergedWebUIConfig = mergeWebUIConfig(this.appConfig.webui, this.server);
      const builder = new AgentUIBuilder({
        events: keyFrameEvents,
        sessionInfo: metadata,
        serverInfo,
        uiConfig: mergedWebUIConfig,
      });

      // Generate HTML
      const html = await builder.dump();

      // Upload if requested and provider is configured
      if (upload && this.appConfig.share?.provider) {
        // Generate normalized slug if agent is available
        let normalizedSlug = '';
        let originalQuery = '';

        if (this.storageProvider && agent) {
          try {
            const events = await this.storageProvider.getSessionEvents(sessionId);
            const firstUserMessage = events.find((e) => e.type === 'user_message');

            if (firstUserMessage && firstUserMessage.content) {
              originalQuery =
                typeof firstUserMessage.content === 'string'
                  ? firstUserMessage.content
                  : firstUserMessage.content.find((c) => c.type === 'text')?.text || '';

              if (originalQuery) {
                const slugGenerator = new SlugGenerator(agent);
                normalizedSlug = await slugGenerator.generateSlug(originalQuery);

                // Additional safety check to ensure slug is URL-safe
                normalizedSlug = normalizedSlug
                  .replace(/[^\x00-\x7F]+/g, '')
                  .replace(/[^\w-]/g, '');
              }
            }
          } catch (error) {
            console.error('Failed to extract query for normalized slug:', error);
          }
        }

        if (normalizedSlug) {
          // Generate 6-digit hash from sessionId to avoid conflicts
          const sessionHash = await this.generateSessionHash(sessionId);
          normalizedSlug = `${normalizedSlug}-${sessionHash}`;
        } else {
          // fallback to sessionId
          normalizedSlug = sessionId;
        }

        // Upload HTML and get share URL
        const shareUrl = await builder.upload(html, this.appConfig.share.provider, {
          slug: normalizedSlug,
          query: originalQuery,
        });

        return {
          success: true,
          url: shareUrl,
          sessionId,
        };
      }

      // Return HTML content if not uploading
      return {
        success: true,
        html,
        sessionId,
      };
    } catch (error) {
      console.error(`Error in shareSession for ${sessionId}:`, error);
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process workspace images in events and replace relative paths with uploaded URLs
   */
  private async processWorkspaceImages(
    events: AgentEventStream.Event[],
    workspace: string,
  ): Promise<AgentEventStream.Event[]> {
    if (!this.appConfig.share?.provider) {
      return events;
    }

    const processedEvents = [...events];
    const imageCache = new Map<string, string>(); // Cache to avoid duplicate uploads

    for (let i = 0; i < processedEvents.length; i++) {
      const event = processedEvents[i];

      // Process different event types that might contain file references
      if (event.type === 'tool_call' && event.name === 'write_file') {
        // Check write_file tool results for image references
        processedEvents[i] = await this.processEventImages(event, workspace, imageCache);
      }
    }

    return processedEvents;
  }

  /**
   * Process images in a single event
   */
  private async processEventImages(
    event: AgentEventStream.Event,
    workspace: string,
    imageCache: Map<string, string>,
  ): Promise<AgentEventStream.Event> {
    let content = '';

    // Extract content based on event type
    if (event.type === 'tool_call' && event.name === 'write_file') {
      content = event.arguments.content;
    } else {
      return event; // No processable content
    }

    // Find relative image paths in content
    const imageMatches = this.findImageReferences(content);
    if (imageMatches.length === 0) {
      return event;
    }

    let processedContent = content;

    // Process each image reference
    for (const match of imageMatches) {
      const { fullMatch, relativePath } = match;

      // Skip if already cached
      if (imageCache.has(relativePath)) {
        const uploadedUrl = imageCache.get(relativePath)!;
        processedContent = processedContent.replace(
          fullMatch,
          fullMatch.replace(relativePath, uploadedUrl),
        );
        continue;
      }

      try {
        // Resolve absolute path
        const absolutePath = path.resolve(workspace, relativePath);

        // Check if file exists and is an image
        if (fs.existsSync(absolutePath) && this.isImageFile(absolutePath)) {
          // Upload the image
          const uploadedUrl = await this.uploadWorkspaceImage(absolutePath, relativePath);

          // Cache the result
          imageCache.set(relativePath, uploadedUrl);

          // Replace in content
          processedContent = processedContent.replace(
            fullMatch,
            fullMatch.replace(relativePath, uploadedUrl),
          );
        }
      } catch (error) {
        console.warn(`Failed to upload workspace image ${relativePath}:`, error);
        // Continue with original path if upload fails
      }
    }

    // Return updated event
    const updatedEvent = { ...event };
    if (event.type === 'tool_call' && event.name === 'write_file') {
      updatedEvent.arguments.content = processedContent;
    }

    return updatedEvent;
  }

  /**
   * Find image references in content
   */
  private findImageReferences(content: string): Array<{ fullMatch: string; relativePath: string }> {
    const imageReferences: Array<{ fullMatch: string; relativePath: string }> = [];

    // Patterns to match relative image paths
    const patterns = [
      // Markdown images: ![alt](./path/to/image.jpg)
      /!\[([^\]]*)\]\(\.\/([^)]+\.(jpg|jpeg|png|gif|webp|svg))\)/gi,
      /!\[([^\]]*)\]\(([^\/][^)]+\.(jpg|jpeg|png|gif|webp|svg))\)/gi,
      // HTML img tags: <img src="./path/to/image.jpg">
      /<img[^>]+src=["']\.\/([^"']+\.(jpg|jpeg|png|gif|webp|svg))["'][^>]*>/gi,
      /<img[^>]+src=["']([^\/][^"']+\.(jpg|jpeg|png|gif|webp|svg))["'][^>]*>/gi,
      // Direct file references in code blocks or text
      /(?:^|\s)(\.\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))(?:\s|$)/gi,
      /(?:^|\s)([^\/\s][^\s]*\.(jpg|jpeg|png|gif|webp|svg))(?:\s|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const fullMatch = match[0];
        // Extract the relative path from different capture groups based on pattern
        let relativePath = '';

        if (match[2] && match[2].includes('.')) {
          // For patterns with capture group 2 containing the path
          relativePath = match[2];
        } else if (match[1] && match[1].includes('.')) {
          // For patterns with capture group 1 containing the path
          relativePath = match[1];
        }

        if (relativePath && !relativePath.startsWith('http') && !relativePath.startsWith('data:')) {
          // Normalize relative path
          if (relativePath.startsWith('./')) {
            relativePath = relativePath.slice(2);
          }

          imageReferences.push({
            fullMatch,
            relativePath,
          });
        }
      }
    }

    return imageReferences;
  }

  /**
   * Check if file is an image based on extension
   */
  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Upload a workspace image to share provider
   */
  private async uploadWorkspaceImage(absolutePath: string, relativePath: string): Promise<string> {
    if (!this.appConfig.share?.provider) {
      throw new Error('Share provider not configured');
    }

    const fileName = path.basename(relativePath);
    const fileContent = fs.readFileSync(absolutePath);

    // Create form data for image upload
    const formData = new FormData();
    const file = new File([fileContent], fileName, {
      type: this.getImageMimeType(absolutePath),
    });

    formData.append('file', file);
    formData.append('type', 'image');
    formData.append('originalPath', relativePath);

    try {
      // FIXME: Support storage.provider
      const storageProvider = this.appConfig.share.provider.replace('/share', '/storage');

      const response = await fetch(storageProvider, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData) {
        if (responseData.cdnUrl) {
          return ensureHttps(responseData.cdnUrl);
        }

        if (responseData.url) {
          return ensureHttps(responseData.url);
        }
      }

      throw new Error('Invalid response from storage provider for image upload');
    } catch (error) {
      console.error(`Failed to upload workspace image ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Get MIME type for image file
   */
  private getImageMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate 6-digit hash from sessionId (Cloudflare Worker compatible)
   */
  private async generateSessionHash(sessionId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 6);
  }

  /**
   * Get share configuration
   */
  getShareConfig(): {
    hasShareProvider: boolean;
    shareProvider: string | null;
  } {
    return {
      hasShareProvider: !!this.appConfig.share?.provider,
      shareProvider: this.appConfig.share?.provider || null,
    };
  }
}
