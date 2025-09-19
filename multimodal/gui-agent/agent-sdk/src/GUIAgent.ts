/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent, ConsoleLogger, LLMRequestHookPayload, LogLevel, Tool } from '@tarko/agent';
import { GUIAgentToolCallEngine } from './ToolCallEngine';
import { SYSTEM_PROMPT } from './prompts';
import { getScreenInfo, setScreenInfo } from './shared';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { GUIAgentConfig } from '@gui-agent/shared/types';
import { Operator, BaseGUIAgent } from '@gui-agent/shared/base';

export class GUIAgent<T extends Operator> extends BaseGUIAgent {
  static label = 'GUI Agent';

  private operator: Operator | undefined;

  constructor(config: GUIAgentConfig<T>) {
    const {
      operator,
      model,
      systemPrompt,
      customeActionParser,
      normalizeCoordinates,
      maxLoopCount,
      loopIntervalInMs,
    } = config;
    super({
      name: 'Seed GUI Agent',
      instructions: SYSTEM_PROMPT,
      tools: [],
      toolCallEngine: GUIAgentToolCallEngine,
      model: model,
      ...(maxLoopCount && { maxIterations: maxLoopCount }),
      logLevel: LogLevel.DEBUG,
    });
    this.operator = operator;
  }

  async initialize() {
    this.registerTool(
      new Tool({
        id: adaptorToolName,
        description: 'operator tool',
        parameters: {},
        function: async (input) => {
          this.logger.log(`${adaptorToolName} input:`, input);
          if (!this.operator) {
            return { status: 'error', message: 'Operator not initialized' };
          }
          const result = await this.operator!.doExecute({
            actions: input.actions,
          });
          if (result.errorMessage) {
            return { status: 'error', message: result.errorMessage };
          }
          return { action: input.action, status: 'success', result };
        },
      }),
    );
    super.initialize();
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // this.logger.log('onLLMRequest', id, payload);
    // await ImageSaver.saveImagesFromPayload(id, payload);
  }

  async onEachAgentLoopStart(sessionId: string) {
    const output = await this.operator!.doScreenshot();
    const base64Tool = new Base64ImageParser(output.base64);
    const base64Uri = base64Tool.getDataUri();
    if (!base64Uri) {
      this.logger.error('Failed to get base64 image uri');
      return;
    }

    const event = this.eventStream.createEvent('environment_input', {
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

    // Extract image dimensions from screenshot
    const dimensions = base64Tool.getDimensions();
    if (dimensions) {
      setScreenInfo({
        screenWidth: dimensions.width,
        screenHeight: dimensions.height,
      });
    }
    this.eventStream.sendEvent(event);
  }

  async onAgentLoopEnd(id: string): Promise<void> {
    // await this.browserOperator.cleanup();
  }

  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ) {
    return args;
  }
}
