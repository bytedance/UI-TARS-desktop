/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentPlugin, COMPUTER_USE_ENVIRONMENT } from '@omni-tars/core';
import { Tool, LLMRequestHookPayload, ChatCompletionContentPart } from '@tarko/agent';
import { createGUIErrorResponse } from '@tarko/shared-utils';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { ImageCompressor, formatBytes } from '@tarko/shared-media-utils';
import { setScreenInfo } from './shared';
import { OperatorManager } from './OperatorManager';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { AIOHybridOperator } from '@gui-agent/operator-aio';

interface GuiAgentPluginOption {
  operatorManager: OperatorManager;
}

/**
 * GUI Agent Plugin - handles COMPUTER_USE_ENVIRONMENT for screen interaction
 */
export class GuiAgentPlugin extends AgentPlugin {
  readonly name = 'gui-agent';
  readonly environmentSection = COMPUTER_USE_ENVIRONMENT;
  private operatorManager: OperatorManager;

  constructor(option: GuiAgentPluginOption) {
    super();

    this.operatorManager = option.operatorManager;
  }

  async initialize(): Promise<void> {
    this.agent.registerTool(
      new Tool({
        id: 'browser_vision_control',
        description: 'operator tool',
        parameters: {},
        function: async (input) => {
          try {
            this.agent.logger.info('browser_vision_control', input);
            const op = await this.operatorManager.getInstance();
            const rawResult = await op?.doExecute({
              rawContent: '',
              rawActionStrings: [],
              actions: input.operator_action,
            });
            if (rawResult?.errorMessage) {
              return createGUIErrorResponse(input.action, rawResult?.errorMessage);
            }
            return {
              success: true,
              action: input.action,
              normalizedAction: input.action_for_gui,
              observation: undefined, // Reserved for future implementation
            };
          } catch (error) {
            // Return error response in GUI Agent format
            return createGUIErrorResponse(input.action, error);
          }
        },
      }),
    );
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // console.log('onLLMRequest', id, payload);
  }

  // async onEachAgentLoopStart(): Promise<void> {
  // }

  // async onEachAgentLoopEnd(): Promise<void> {
  // }

  async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): Promise<void> {
    this.agent.logger.info('onAfterToolCall toolCall', JSON.stringify(toolCall));

    if (toolCall.name !== 'browser_vision_control') {
      this.agent.logger.info('onAfterToolCall: skipping screenshot');
      return;
    }

    const operator = await this.operatorManager.getInstance();
    const output = await operator?.doScreenshot();
    if (!output?.base64) {
      this.agent.logger.error('Failed to get screenshot');
      return;
    }
    const base64Tool = new Base64ImageParser(output.base64);
    const originalBuffer = Buffer.from(output.base64, 'base64');
    const originalSize = originalBuffer.byteLength;

    // Create image compressor with WebP format and 80% quality
    const compressor = new ImageCompressor({
      quality: 80,
      format: 'webp',
    });
    const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
    const compressedBase64 = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
    const compressedSize = compressedBuffer.byteLength;
    const compressionRatio = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

    this.agent.logger.debug(`compression stat: `, {
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      compressionRatio: `${compressionRatio}% reduction`,
    });

    const content: ChatCompletionContentPart[] = [
      {
        type: 'image_url',
        image_url: {
          url: compressedBase64,
        },
      },
    ];

    if (output?.url) {
      content.push({
        type: 'text',
        text: `The current page's url: ${output.url}`,
      });
    }

    const eventStream = this.agent.getEventStream();
    const events = eventStream.getEvents();
    this.agent.logger.info('onAfterToolCall events length:', events.length);

    const event = eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content,
      metadata: {
        type: 'screenshot',
        url: output?.url,
      },
    });
    eventStream.sendEvent(event);
    // Extract image dimensions from screenshot
    const dimensions = base64Tool.getDimensions();
    if (dimensions) {
      setScreenInfo({
        screenWidth: dimensions.width,
        screenHeight: dimensions.height,
      });
    }
  }

  private findLastMatch<T>(array: T[], callback: (item: T) => boolean) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (callback(array[i])) {
        return array[i];
      }
    }
    return undefined;
  }
}
