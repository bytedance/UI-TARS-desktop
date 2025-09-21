/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LLMRequestHookPayload, LogLevel, Tool } from '@tarko/agent';
import { GUIAgentToolCallEngine } from './ToolCallEngine';
import { SYSTEM_PROMPT } from './prompts';
import { getScreenInfo, setScreenInfo } from './shared';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { Operator, BaseGUIAgent } from '@gui-agent/shared/base';
import { GUIAgentConfig, NormalizeCoordinates } from '@gui-agent/shared/types';
import {
  assembleSystemPrompt,
  isSystemPromptTemplate,
  defaultNormalizeCoords,
  normalizeActionCoords,
} from '@gui-agent/shared/utils';
import { GUI_ADAPTED_TOOL_NAME } from './constants';

export class GUIAgent<T extends Operator> extends BaseGUIAgent {
  static label = 'GUI Agent';

  private operator: Operator | undefined;
  private normalizeCoordinates: NormalizeCoordinates;

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
    let finalSystemPrompt = SYSTEM_PROMPT;
    if (typeof systemPrompt === 'string') {
      finalSystemPrompt = systemPrompt;
    } else if (systemPrompt && isSystemPromptTemplate(systemPrompt)) {
      finalSystemPrompt = assembleSystemPrompt(systemPrompt, operator.getSupportedActions());
    }
    super({
      name: 'Seed GUI Agent',
      instructions: finalSystemPrompt,
      tools: [],
      toolCallEngine: GUIAgentToolCallEngine,
      model: model,
      ...(maxLoopCount && { maxIterations: maxLoopCount }),
      logLevel: LogLevel.DEBUG,
    });
    this.operator = operator;
    this.normalizeCoordinates = normalizeCoordinates ?? defaultNormalizeCoords;
    this.logger = this.logger.spawn('[GUIAgent]');
  }

  async initialize() {
    // Register the GUI tool
    this.registerTool(
      new Tool({
        id: GUI_ADAPTED_TOOL_NAME,
        description: 'operator tool',
        parameters: {}, // no need to pass parameters
        function: async (input) => {
          this.logger.log(`${GUI_ADAPTED_TOOL_NAME} input:`, input);
          if (!this.operator) {
            return { status: 'error', message: 'Operator not initialized' };
          }
          // normalize coordinates
          if (input.operator_action) {
            input.operator_action = normalizeActionCoords(
              input.operator_action,
              this.normalizeCoordinates,
            );
          }
          const result = await this.operator!.doExecute({
            actions: [input.operator_action],
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
