/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Operator } from '@ui-tars/sdk/core';
import { Agent, AgentOptions, LLMRequestHookPayload, LogLevel, Tool } from '@tarko/agent';
import { SeedGUIAgentToolCallEngine } from './SeedGUIAgentToolCallEngine';
import { SYSTEM_PROMPT } from './constants';
import { getScreenInfo, setScreenInfo } from './shared';
import { ImageSaver } from './utils/ImageSaver';
import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { ComputerOperator } from './ComputerOperator';
import { AdbOperator, getAndroidDeviceId } from '@ui-tars/operator-adb';

const addBase64ImagePrefix = (base64: string) => {
  if (!base64) return '';
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
};

export interface GUIAgentConfig extends AgentOptions {
  operatorType: 'browser' | 'computer' | 'android';
  uiTarsVersion?:
    | 'ui-tars-1.0'
    | 'ui-tars-1.5'
    | 'doubao-1.5-ui-tars-15b'
    | 'doubao-1.5-ui-tars-20b';
  // ===== Optional =====
  systemPrompt?: string;
  signal?: AbortSignal;
  maxLoopCount?: number;
  loopIntervalInMs?: number;
}

export class SeedGUIAgent extends Agent {
  static label = 'Seed GUI Agent';

  private operatorType: GUIAgentConfig['operatorType'];
  private operator: Operator | undefined;

  constructor(config: GUIAgentConfig) {
    const { operatorType, model, systemPrompt, signal, maxLoopCount, loopIntervalInMs } = config;
    super({
      name: 'Seed GUI Agent',
      instructions: systemPrompt ?? SYSTEM_PROMPT,
      tools: [],
      toolCallEngine: SeedGUIAgentToolCallEngine,
      model: model,
      maxIterations: maxLoopCount ?? 100,
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
        logger: undefined,
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
        console.error('No Android devices found. Please connect a device and try again.');
        process.exit(0);
      }
      const adbOperator = new AdbOperator(deviceId);
      this.operator = adbOperator;
    } else {
      throw new Error(`Unknown operator type: ${this.operatorType}`);
    }
  }

  async initialize() {
    await this.initilizeOperator();

    this.registerTool(
      new Tool({
        id: 'operator-adaptor-tool',
        description: 'operator tool',
        parameters: {},
        function: async (input) => {
          console.log(input);
          await this.operator!.execute({
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
    const eventStream = this.getEventStream();
    eventStream.subscribe((event) => {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      console.log(`[${timestamp}] 收到事件: ${event.type}`, event);
      switch (event.type) {
        case 'user_message':
          console.log('用户消息:', event.content);
          break;
        case 'assistant_message':
          console.log('助手回复:', event.content);
          break;
        case 'tool_call':
          console.log('工具调用:', event.name, event.arguments);
          break;
        case 'tool_result':
          console.log('工具结果:', event.content);
          break;
        case 'environment_input':
          console.log('环境输入:', event.description);
          break;
        case 'agent_run_start':
          console.log('Agent开始执行');
          break;
        case 'agent_run_end':
          console.log('Agent执行结束');
          break;
        default:
          console.log('其他事件:', event);
      }
    });
    super.initialize();
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    console.log('onLLMRequest', id, payload);
    // await ImageSaver.saveImagesFromPayload(id, payload);
  }

  async onEachAgentLoopStart(sessionId: string) {
    const output = await this.operator!.screenshot();
    const event = this.eventStream.createEvent('environment_input', {
      description: 'Browser Screenshot',
      content: [
        {
          type: 'text',
          text: 'Screenshot: ',
        },
        {
          type: 'image_url',
          image_url: {
            url: addBase64ImagePrefix(output.base64),
          },
        },
      ],
    });

    // Extract image dimensions from screenshot
    this.extractImageDimensionsFromBase64(output.base64);
    this.eventStream.sendEvent(event);
  }

  async onAgentLoopEnd(id: string): Promise<void> {
    // await this.browserOperator.cleanup();
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
