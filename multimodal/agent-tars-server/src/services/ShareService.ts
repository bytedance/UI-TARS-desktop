/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@agent-tars/core';
import { SessionMetadata, StorageProvider } from '../storage';
import { ShareUtils } from '../utils/share';
import { SlugGenerator } from '../utils/slug-generator';
import type { AgentTARSAppConfig } from '../types';
import type { IAgent } from '@agent-tars/interface';

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
   * @returns Share result with URL or HTML content
   */
  async shareSession(
    sessionId: string,
    upload = false,
    agent?: IAgent,
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

      // Generate HTML content
      const shareHtml = this.generateShareHtml(keyFrameEvents, metadata);

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
  private generateShareHtml(events: AgentEventStream.Event[], metadata: SessionMetadata): string {
    if (!this.appConfig.ui.staticPath) {
      throw new Error('Cannot found static path.');
    }

    const modelInfo = {
      provider: process.env.MODEL_PROVIDER || this.appConfig?.model?.provider || 'Default Provider',
      model: process.env.MODEL_NAME || this.appConfig?.model?.id || 'Default Model',
    };

    return ShareUtils.generateShareHtml(events, metadata, this.appConfig.ui.staticPath, modelInfo);
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
          }
        }
      } catch (error) {
        console.warn('Failed to extract query for normalized slug:', error);
      }
    }

    if (normalizedSlug) {
      // add session id to avoid avoid conflict
      normalizedSlug = `${normalizedSlug}-${sessionId}`;
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
   * Get share configuration
   */
  getShareConfig(): {
    hasShareProvider: boolean;
    shareProvider: string | null;
  } {
    return {
      hasShareProvider: !!this.appConfig.share.provider,
      shareProvider: this.appConfig.share.provider || null,
    };
  }
}
