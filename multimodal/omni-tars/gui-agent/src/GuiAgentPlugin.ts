/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentPlugin, COMPUTER_USE_ENVIRONMENT } from '@omni-tars/core';
import {
  Tool,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  AgentEventStream,
} from '@tarko/agent';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { getScreenInfo, setScreenInfo } from './shared';
import { OperatorManager } from './OperatorManager';

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
          console.log(input);
          const op = await this.operatorManager.getInstance();
          const result = await op?.execute({
            parsedPrediction: input.operator_action,
            screenWidth: getScreenInfo().screenWidth ?? 1000,
            screenHeight: getScreenInfo().screenHeight ?? 1000,
            prediction: input.operator_action,
            scaleFactor: 1000,
            factors: [1, 1],
          });
          return { action: input.action, status: 'success', result };
        },
      }),
    );
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // console.log('onLLMRequest', id, payload);
  }

  // async onEachAgentLoopStart(): Promise<void> {
  // }

  async onEachAgentLoopEnd(): Promise<void> {
    const events = this.agent.getEventStream().getEvents();
    const lastToolCallIsComputerUse = this.findLastMatch<AgentEventStream.Event>(
      events,
      (item) => item.type === 'tool_call' && item.name === 'browser_vision_control',
    );
    if (!lastToolCallIsComputerUse) {
      this.agent.logger.info('Last tool not GUI action, skipping screenshot');
      return;
    }

    this.agent.logger.info('onEachAgentLoopEnd lastToolCall', lastToolCallIsComputerUse);

    const operator = await this.operatorManager.getInstance();
    const output = await operator?.screenshot();
    if (!output) {
      console.error('Failed to get screenshot');
      return;
    }
    const base64Tool = new Base64ImageParser(output.base64);
    const base64Uri = base64Tool.getDataUri();
    if (!base64Uri) {
      console.error('Failed to get base64 image uri');
      return;
    }
    const eventStream = this.agent.getEventStream();
    const event = eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: base64Uri,
          },
        },
      ],
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
