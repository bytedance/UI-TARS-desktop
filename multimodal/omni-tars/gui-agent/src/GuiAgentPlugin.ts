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
  ChatCompletionContentPart,
} from '@tarko/agent';
import {
  GUIExecuteResult,
  convertToGUIResponse,
  createGUIErrorResponse,
} from '@tarko/shared-utils';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { getScreenInfo, setScreenInfo } from './shared';
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
            const rawResult = await op?.execute({
              parsedPrediction: input.operator_action,
              screenWidth: getScreenInfo().screenWidth ?? 1000,
              screenHeight: getScreenInfo().screenHeight ?? 1000,
              prediction: input.operator_action,
              scaleFactor: 1000,
              factors: [1, 1],
            });
            const result = rawResult as unknown as GUIExecuteResult;

            // Convert to GUI Agent protocol format
            const guiResponse = convertToGUIResponse(input.action, input.operator_action, result);
            return guiResponse;
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

    const meta =
      operator instanceof BrowserOperator || operator instanceof AIOHybridOperator
        ? await operator.getMeta()
        : null;
    const content: ChatCompletionContentPart[] = [
      {
        type: 'image_url',
        image_url: {
          url: base64Uri,
        },
      },
    ];

    if (meta?.url) {
      content.push({
        type: 'text',
        text: `The current page's url: ${meta?.url}`,
      });
    }

    const eventStream = this.agent.getEventStream();
    const event = eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content,
      metadata: {
        type: 'screenshot',
        url: meta?.url,
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
