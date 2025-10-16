/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  LLMRequestHookPayload,
  ChatCompletionContentPart,
  LogLevel,
  Tool,
  ConsoleLogger,
} from '@tarko/agent';
import { GUIAgentToolCallEngine } from './ToolCallEngine';
import { SYSTEM_PROMPT } from './prompts';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { Operator, BaseGUIAgent } from '@gui-agent/shared/base';
import {
  GUIAgentConfig,
  NormalizeCoordinates,
  ImageDetailCalculator,
} from '@gui-agent/shared/types';
import {
  assembleSystemPrompt,
  isSystemPromptTemplate,
  normalizeActionCoords,
  sleep,
} from '@gui-agent/shared/utils';
import { GUI_ADAPTED_TOOL_NAME } from './constants';
import { convertToAgentUIAction, createGUIErrorResponse } from './utils';
import { defaultNormalizeCoords, defaultDetailCalculator } from './defaultImpls';

const defaultLogger = new ConsoleLogger('[GUIAgent]', LogLevel.DEBUG);

export class GUIAgent<T extends Operator> extends BaseGUIAgent {
  static label = 'GUI Agent';

  private operator: Operator | undefined;
  private normalizeCoordinates: NormalizeCoordinates;
  private detailCalculator: ImageDetailCalculator;
  private loopIntervalInMs: number;

  constructor(config: GUIAgentConfig<T>) {
    const {
      operator,
      model,
      systemPrompt,
      customeActionParser,
      normalizeCoordinates,
      detailCalculator,
      maxLoopCount,
      loopIntervalInMs = 500,
    } = config;
    let finalSystemPrompt = SYSTEM_PROMPT;
    if (typeof systemPrompt === 'string') {
      finalSystemPrompt = systemPrompt;
    } else if (systemPrompt && isSystemPromptTemplate(systemPrompt)) {
      finalSystemPrompt = assembleSystemPrompt(systemPrompt, operator.getSupportedActions());
    }
    defaultLogger.debug('final instructions for sp:', finalSystemPrompt);

    // Create a adapted ToolCallEngine constructor that captures the customeActionParser
    const AdaptedToolCallEngine = class extends GUIAgentToolCallEngine {
      constructor() {
        super(customeActionParser);
      }
    };

    super({
      name: GUIAgent.label,
      instructions: finalSystemPrompt,
      tools: [],
      toolCallEngine: AdaptedToolCallEngine,
      model: model,
      ...(maxLoopCount && { maxIterations: maxLoopCount }),
      logLevel: LogLevel.DEBUG,
    });
    this.operator = operator;
    this.normalizeCoordinates = normalizeCoordinates ?? defaultNormalizeCoords;
    // Default detail calculator implementation
    this.detailCalculator = detailCalculator ?? defaultDetailCalculator;
    this.loopIntervalInMs = loopIntervalInMs;
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
            return createGUIErrorResponse(input.action, 'Operator not initialized');
          }
          if (input.errorMessage) {
            return createGUIErrorResponse(input.action, input.errorMessage);
          }
          // normalize coordinates
          if (input.operator_action) {
            input.operator_action = normalizeActionCoords(
              input.operator_action,
              this.normalizeCoordinates,
            );
          }
          this.logger.info('action to execute:', JSON.stringify(input.operator_action));
          const result = await this.operator!.doExecute({
            actions: [input.operator_action],
          });
          if (result.errorMessage) {
            return createGUIErrorResponse(input.action, result.errorMessage);
          }
          // return { action: input.action, status: 'success', result };
          return {
            success: true,
            action: input.action,
            normalizedAction: convertToAgentUIAction(input.operator_action),
            observation: undefined, // Reserved for future implementation
          };
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
    this.logger.info('onEachAgentLoopStart', sessionId);
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

  async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): Promise<unknown> {
    this.logger.info('onAfterToolCall toolCall', JSON.stringify(toolCall));

    if (toolCall.name !== GUI_ADAPTED_TOOL_NAME) {
      this.logger.info('onAfterToolCall: skipping screenshot');
      return;
    }

    await sleep(this.loopIntervalInMs);

    const output = await this.operator!.doScreenshot();
    if (!output) {
      this.logger.error('Failed to get screenshot');
      return;
    }

    const base64Tool = new Base64ImageParser(output.base64);
    const base64Uri = base64Tool.getDataUri();
    if (!base64Uri) {
      this.logger.error('Failed to get base64 image uri');
      return;
    }

    const { width: imageWidth, height: imageHeight } = base64Tool.getDimensions() || {
      width: -1,
      height: -1,
    };

    const content: ChatCompletionContentPart[] = [
      {
        type: 'image_url',
        image_url: {
          url: base64Uri,
          detail: this.detailCalculator(imageWidth, imageHeight),
        },
      },
    ];

    if (output?.url) {
      content.push({
        type: 'text',
        text: `The current page's url: ${output.url}`,
      });
    }

    const eventStream = this.getEventStream();
    const events = eventStream.getEvents();
    this.logger.info('onAfterToolCall events length:', events.length);

    const event = eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content,
      metadata: {
        type: 'screenshot',
        url: output?.url,
      },
    });
    eventStream.sendEvent(event);
    return result;
  }
}
