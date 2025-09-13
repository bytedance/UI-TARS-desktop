/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentServer } from '@tarko/agent-server';
import { AgentUIBuilder } from '@tarko/agent-ui-builder';
import { isAgentWebUIImplementationType } from '@tarko/interface';
import { HeadlessOutputOptions } from '../types';
import path from 'path';
import fs from 'fs';

// Simple web UI config merger (inline implementation)
function mergeWebUIConfig(baseConfig: any, server?: AgentServer): any {
  const agentConstructorWebConfig = server?.getAgentConstructorWebConfig?.();
  return { ...baseConfig, ...agentConstructorWebConfig };
}

/**
 * Generate replay output for headless mode
 */
export async function generateReplayOutput(
  server: AgentServer,
  sessionId: string,
  options: HeadlessOutputOptions,
): Promise<{
  success: boolean;
  filePath?: string;
  shareUrl?: string;
  error?: string;
}> {
  try {
    if (!options.replay) {
      return { success: true };
    }

    // Determine replay mode
    const replayMode = typeof options.replay === 'string' ? options.replay : 'local';
    const isUploadMode = replayMode === 'upload' || replayMode === 'true';

    // Verify storage is available
    if (!server.storageProvider) {
      throw new Error('Storage not configured, cannot generate replay');
    }

    // Get session metadata and events
    const metadata = await server.storageProvider.getSessionInfo(sessionId);
    if (!metadata) {
      throw new Error('Session not found');
    }

    const events = await server.storageProvider.getSessionEvents(sessionId);

    // Filter key frame events, exclude streaming messages
    const keyFrameEvents = events.filter(
      (event) =>
        event.type !== 'assistant_streaming_message' &&
        event.type !== 'assistant_streaming_thinking_message' &&
        event.type !== 'final_answer_streaming',
    );

    // Validate web UI configuration
    if (!isAgentWebUIImplementationType(server.appConfig.webui!, 'static')) {
      throw new Error(`Unsupported web ui type: ${server.appConfig.webui!.type}`);
    }

    if (!server.appConfig.webui?.staticPath) {
      throw new Error('Cannot find static path.');
    }

    // Merge web UI config
    const mergedWebUIConfig = mergeWebUIConfig(server.appConfig.webui, server);

    // Create UI builder
    const builder = new AgentUIBuilder({
      events: keyFrameEvents,
      sessionInfo: metadata,
      staticPath: server.appConfig.webui.staticPath,
      serverInfo: server.versionInfo,
      uiConfig: mergedWebUIConfig,
    });

    if (isUploadMode && server.appConfig.share?.provider) {
      // Upload mode: upload to share provider
      const html = builder.dump();
      const shareUrl = await builder.upload(html, server.appConfig.share.provider, {
        slug: sessionId,
        query: extractQueryFromEvents(events),
      });

      return {
        success: true,
        shareUrl,
      };
    } else {
      // Local mode: save to disk
      const outputDir = options.outputDir || process.cwd();
      const fileName = `replay-${sessionId}-${Date.now()}.html`;
      const filePath = path.join(outputDir, fileName);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate and save HTML
      builder.dump(filePath);

      return {
        success: true,
        filePath,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract query from events for metadata
 */
function extractQueryFromEvents(events: any[]): string {
  const firstUserMessage = events.find((e) => e.type === 'user_message');
  if (firstUserMessage && firstUserMessage.content) {
    return typeof firstUserMessage.content === 'string'
      ? firstUserMessage.content
      : firstUserMessage.content.find((c: any) => c.type === 'text')?.text || '';
  }
  return '';
}
