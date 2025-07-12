/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { AgentEventStream } from '@agent-tars/core';
import { SessionMetadata, StorageProvider } from '../storage';
import { ShareUtils } from '../utils/share';
import { SlugGenerator } from '../utils/slug-generator';
import type { AgentTARSAppConfig } from '../types';
import type { AgentTARSServerVersionInfo, IAgent } from '@agent-tars/interface';

/**
 * ShareService - Centralized service for handling session sharing
 *
 * Responsible for:
 * - Generating shareable HTML content
 * - Uploading shared content to providers
 * - Managing share metadata and slugs
 */
export class ShareService {
  constructor(
    private appConfig: Required<AgentTARSAppConfig>,
    private storageProvider: StorageProvider | null,
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
    serverInfo?: AgentTARSServerVersionInfo,
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
      const metadata = await this.storageProvider.getSessionMetadata(sessionId);
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
      const shareHtml = this.generateShareHtml(keyFrameEvents, metadata, serverInfo);

      // Upload if requested and provider is configured
      if (upload && this.appConfig.share.provider) {
        const shareUrl = await this.uploadShareHtml(shareHtml, sessionId, metadata, agent);
        return {
          success: true,
          url: shareUrl,
          sessionId,
        };
      }

      // Return HTML content if not uploading
      return {
        success: true,
        html: shareHtml,
        sessionId,
      };
    } catch (error) {
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate shareable HTML content
   */

  private generateShareHtml(
    events: AgentEventStream.Event[],
    metadata: SessionMetadata,
    serverInfo?: AgentTARSServerVersionInfo,
  ): string {
    if (!this.appConfig.ui.staticPath) {
      throw new Error('Cannot found static path.');
    }

    return ShareUtils.generateShareHtml(events, metadata, this.appConfig.ui.staticPath, serverInfo);
  }

  /**
   * Upload share HTML to provider
   */
  private async uploadShareHtml(
    html: string,
    sessionId: string,
    metadata: SessionMetadata,
    agent?: IAgent,
  ): Promise<string> {
    if (!this.appConfig.share.provider) {
      throw new Error('Share provider not configured');
    }

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
            normalizedSlug = normalizedSlug.replace(/[^\x00-\x7F]+/g, '').replace(/[^\w-]/g, '');
          }
        }
      } catch (error) {
        console.warn('Failed to extract query for normalized slug:', error);
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

    return ShareUtils.uploadShareHtml(html, sessionId, this.appConfig.share.provider, {
      metadata,
      slug: normalizedSlug,
      query: originalQuery,
    });
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
