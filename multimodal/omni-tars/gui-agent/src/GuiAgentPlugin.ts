/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentPlugin, COMPUTER_USE_ENVIRONMENT } from '@omni-tars/core';
import { Tool, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';
import { getScreenInfo, setScreenInfo } from './shared';
import { OperatorManager } from './OperatorManager';

const addBase64ImagePrefix = (base64: string) => {
  if (!base64) return '';
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
};

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
        id: 'operator-adaptor-tool',
        description: 'operator tool',
        parameters: {},
        function: async (input) => {
          console.log(input);
          const op = await this.operatorManager.getInstance();
          await op.execute({
            parsedPrediction: input,
            screenWidth: getScreenInfo().screenWidth ?? 1000,
            screenHeight: getScreenInfo().screenHeight ?? 1000,
            prediction: input,
            scaleFactor: 1000,
            factors: [1, 1],
          });
        },
      }),
    );
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // console.log('onLLMRequest', id, payload);
  }

  async onEachAgentLoopStart(): Promise<void> {
    const operator = await this.operatorManager.getInstance();
    const output = await operator.screenshot();
    const eventStream = this.agent.getEventStream();
    const event = eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: addBase64ImagePrefix(output.base64),
          },
        },
      ],
    });
    eventStream.sendEvent(event);
    // Extract image dimensions from screenshot
    this.extractImageDimensionsFromBase64(output.base64);
  }

  /**
   * Extract width and height information from base64 encoded image
   */
  private extractImageDimensionsFromBase64(base64String: string): void {
    // Remove base64 prefix (if any)
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

    // Decode base64 to binary data
    const buffer = Buffer.from(base64Data, 'base64');

    // Check image type and extract dimensions
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      // PNG format: width in bytes 16-19, height in bytes 20-23
      setScreenInfo({
        screenWidth: buffer.readUInt32BE(16),
        screenHeight: buffer.readUInt32BE(20),
      });
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      // JPEG format: need to parse SOF0 marker (0xFFC0)
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;

        const marker = buffer[offset + 1];
        const segmentLength = buffer.readUInt16BE(offset + 2);

        // SOF0, SOF2 markers contain dimension information
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
          setScreenInfo({
            screenHeight: buffer.readUInt16BE(offset + 5),
            screenWidth: buffer.readUInt16BE(offset + 7),
          });
          break;
        }

        offset += 2 + segmentLength;
      }
    }
  }
}
