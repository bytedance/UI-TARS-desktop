/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Operator } from '@ui-tars/sdk/core';
import {
  Agent,
  AgentOptions,
  AgentEventStream,
  EachAgentLoopEndContext,
  LLMRequestHookPayload,
  LogLevel,
  Tool,
} from '@tarko/agent';
import { SeedGUIAgentToolCallEngine } from './SeedGUIAgentToolCallEngine';
import { SYSTEM_PROMPT } from './constants';
import { getScreenInfo, setScreenInfo } from './shared';
import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { ComputerOperator } from './ComputerOperator';
import { AdbOperator, getAndroidDeviceId } from '@ui-tars/operator-adb';
import { Base64ImageParser } from '@agent-infra/media-utils';

export interface GUIAgentConfig extends AgentOptions {
  operatorType: 'browser' | 'computer' | 'android';
  uiTarsVersion?:
    | 'ui-tars-1.0'
    | 'ui-tars-1.5'
    | 'doubao-1.5-ui-tars-15b'
    | 'doubao-1.5-ui-tars-20b'
    | 'latest';
  // ===== Optional =====
  systemPrompt?: string;
  // signal?: AbortSignal;
  maxLoopCount?: number;
  // loopIntervalInMs?: number;
}

const TOOL_ADAPTER_NAME = 'browser_vision_control';

export class SeedGUIAgent extends Agent {
  static label = 'Seed GUI Agent';

  private operatorType: GUIAgentConfig['operatorType'];
  private operator: Operator | undefined;

  constructor(config: GUIAgentConfig) {
    const {
      operatorType,
      model,
      systemPrompt,
      /* signal, */ maxLoopCount /*, loopIntervalInMs */,
    } = config;
    super({
      name: 'Seed GUI Agent',
      instructions: systemPrompt ?? SYSTEM_PROMPT,
      tools: [],
      toolCallEngine: SeedGUIAgentToolCallEngine,
      model: model,
      ...(maxLoopCount && { maxIterations: maxLoopCount }),
      logLevel: LogLevel.ERROR,
    });

    const logger = this.logger;

    this.operatorType = operatorType;

    logger.setLevel(LogLevel.DEBUG);
  }

  async initilizeOperator() {
    if (this.operator) {
      return;
    }

    if (this.operatorType === 'browser') {
      const browser = new LocalBrowser();
      const browserOperator = new BrowserOperator({
        browser,
        browserType: 'chrome',
        logger: this.logger,
        highlightClickableElements: false,
        showActionInfo: false,
      });

      await browser.launch();
      const openingPage = await browser.createPage();
      await openingPage.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });
      this.operator = browserOperator;
    } else if (this.operatorType === 'computer') {
      const computerOperator = new ComputerOperator();
      this.operator = computerOperator;
    } else if (this.operatorType === 'android') {
      const deviceId = await getAndroidDeviceId();
      if (deviceId == null) {
        this.logger.error('No Android devices found. Please connect a device and try again.');
        process.exit(0);
      }
      const adbOperator = new AdbOperator(deviceId);
      this.operator = adbOperator;
    } else {
      throw new Error(`Unknown operator type: ${this.operatorType}`);
    }
  }

  async initialize() {
    this.registerTool(
      new Tool({
        id: TOOL_ADAPTER_NAME,
        description: 'operator tool',
        parameters: {},
        function: async (input) => {
          this.logger.log(`${TOOL_ADAPTER_NAME} input:`, input);
          if (!this.operator) {
            return { status: 'error', message: 'Operator not initialized' };
          }
          const result = await this.operator!.execute({
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
    super.initialize();
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // this.logger.log('onLLMRequest', id, payload);
    // await ImageSaver.saveImagesFromPayload(id, payload);
  }

  // async onEachAgentLoopStart(sessionId: string) {
  // }

  async onEachAgentLoopEnd(context: EachAgentLoopEndContext): Promise<void> {
    const events = this.getEventStream().getEvents();
    const lastToolCallIsComputerUse = this.findLastMatch<AgentEventStream.Event>(
      events,
      (item) => item.type === 'tool_call' && item.name === TOOL_ADAPTER_NAME,
    );
    if (!lastToolCallIsComputerUse) {
      this.logger.info('Last tool not GUI action, skipping screenshot');
      return;
    }

    this.logger.info('onEachAgentLoopEnd lastToolCall', lastToolCallIsComputerUse);

    const output = await this.operator?.screenshot();
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
    const eventStream = this.getEventStream();
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

  async onAgentLoopEnd(id: string): Promise<void> {
    // await this.browserOperator.cleanup();
  }

  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ) {
    if (toolCall.name.includes(TOOL_ADAPTER_NAME)) {
      await this.initilizeOperator();
    }
    return args;
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
