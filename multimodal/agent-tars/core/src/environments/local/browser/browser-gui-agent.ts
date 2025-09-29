/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser, Page, RemoteBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { ConsoleLogger, AgentEventStream, Tool, z } from '@tarko/mcp-agent';
import { ImageCompressor, formatBytes } from '@tarko/shared-media-utils';
import { ActionInputs, PredictionParsed } from '@agent-tars/interface';
import {
  convertToGUIResponse,
  createGUIErrorResponse,
  GUIExecuteResult,
} from '@tarko/shared-utils';

function sleep(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

/**
 * Browser initialization options
 */
export interface GUIAgentOptions {
  /** browser instance to use */
  browser: LocalBrowser | RemoteBrowser;
  /** The logger instance to use */
  logger: ConsoleLogger;
  /** Whether to run browser in headless mode */
  headless?: boolean;
  /** Scaling factors for coordinates */
  factors?: [number, number];
  /** Event stream instance for injecting environment info */
  eventStream?: AgentEventStream.Processor;
}

/**
 * Browser GUI Agent for visual browser automation
 */
export class BrowserGUIAgent {
  private browser: LocalBrowser | RemoteBrowser;
  private browserOperator: BrowserOperator;
  private screenWidth?: number;
  private screenHeight?: number;
  private browserGUIAgentTool: Tool;
  private logger: ConsoleLogger;
  private factors: [number, number];
  private eventStream?: AgentEventStream.Processor;
  public currentScreenshot?: string;

  /**
   * Creates a new GUI Agent
   * @param options - Configuration options
   */
  constructor(private options: GUIAgentOptions) {
    this.logger = options.logger;
    this.factors = options.factors || [1000, 1000];
    this.eventStream = options.eventStream;

    // Use provided browser instance
    this.browser = this.options.browser;

    // Initialize browser operator
    this.browserOperator = new BrowserOperator({
      browser: this.browser,
      browserType: 'chrome',
      logger: this.logger,
      highlightClickableElements: false,
      showActionInfo: false,
      showWaterFlow: false,
    });

    // Create the tool definition
    this.browserGUIAgentTool = new Tool({
      id: 'browser_vision_control',
      description: `A browser operation tool based on visual understanding, perform the next action to complete the task.

## Action Space

click(point='<point>x1 y1</point>')            - Click at the specified coordinates
left_double(point='<point>x1 y1</point>')      - Double-click at the specified coordinates
right_single(point='<point>x1 y1</point>')     - Right-click at the specified coordinates
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>') - Drag from start to end point
hotkey(key='ctrl c')                           - Press keyboard shortcut (use space to separate keys, lowercase)
type(content='xxx')                            - Type text content (use \\', \\", and \\n for special characters)
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') - Scroll in specified direction
wait()                                         - Wait 5 seconds and take a screenshot to check for changes

## Note
- Folow user lanuage in in \`thought\` part.
- Describe your thought in \`step\` part.
- Describe your action in \`Step\` part.
- Extract the data your see in \`pageData\` part.
- This tool is for operational tasks, not for collect information.
`,
      parameters: z.object({
        thought: z
          .string()
          .describe(
            'Your observation and small plan in one sentence, DO NOT include " characters to avoid failure to render in JSON',
          ),
        step: z
          .string()
          .describe('Finally summarize the next action (with its target element) in one sentence'),
        action: z.string().describe('Some action in action space like click or press'),
      }),
      function: async ({ thought, step, action }) => {
        try {
          const parsed = this.parseAction(action);
          parsed.thought = thought;

          this.logger.debug({
            thought,
            step,
            action,
            parsedAction: JSON.stringify(parsed, null, 2),
            screenDimensions: {
              width: this.screenWidth,
              height: this.screenHeight,
            },
          });

          const operatorResult: GUIExecuteResult = await this.browserOperator.execute({
            parsedPrediction: parsed,
            screenWidth: this.screenWidth || 1920,
            screenHeight: this.screenHeight || 1080,
          });

          await sleep(500);

          const guiResponse = convertToGUIResponse(action, parsed, operatorResult);
          return guiResponse;
        } catch (error) {
          this.logger.error(
            `Browser action failed: ${error instanceof Error ? error.message : String(error)}`,
          );

          // Return error response in new format
          return createGUIErrorResponse(action, error);
        }
      },
    });
  }

  /**
   * Set the event stream instance
   * @param eventStream - The event stream instance
   */
  public setEventStream(eventStream: AgentEventStream.Processor): void {
    this.eventStream = eventStream;
  }

  /**
   * Get the tool definition for GUI Agent browser control
   */
  getTool(): Tool {
    return this.browserGUIAgentTool;
  }

  async screenshot() {
    // Record screenshot start time
    const startTime = performance.now();

    const output = await this.browserOperator.screenshot();

    // Calculate screenshot time
    const endTime = performance.now();
    const screenshotTime = (endTime - startTime).toFixed(2);

    // Extract image dimensions from screenshot
    this.extractImageDimensionsFromBase64(output.base64);

    // Calculate original image size
    const originalBuffer = Buffer.from(output.base64, 'base64');
    const originalSize = originalBuffer.length;

    // Compress the image
    const imageCompressor = new ImageCompressor({
      quality: 80,
      format: 'webp',
    });

    const compressedBuffer = await imageCompressor.compressToBuffer(originalBuffer);
    const compressedSize = compressedBuffer.length;

    // Convert compressed buffer to base64
    const compressedBase64 = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;

    // Get current page URL
    let currentUrl: string | undefined;
    try {
      const page = await this.getPage();
      currentUrl = page.url();
    } catch (error) {
      this.logger.warn('Failed to get current page URL for screenshot metadata:', error);
    }

    return {
      originalSize,
      screenshotTime,
      compressedSize,
      compressedBase64,
      currentUrl,
    };
  }

  /**
   * Hook for starting each agent loop
   * - Takes a screenshot
   * - Extracts image dimensions
   * - Sends the screenshot to the event stream
   */
  async onEachAgentLoopStart(
    eventStream: AgentEventStream.Processor,
    isReplaySnapshot = false,
  ): Promise<void> {
    console.log('Agent Loop Start');

    // Store the event stream for later use
    this.eventStream = eventStream;

    // Early return for replay snapshots
    if (isReplaySnapshot) {
      // Send screenshot to event stream as environment input
      const event = eventStream.createEvent('environment_input', {
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQSk',
            },
          },
        ],
        description: 'Browser Screenshot',
        metadata: {
          type: 'screenshot',
        },
      });

      return eventStream.sendEvent(event);
    }

    try {
      // Check if browser is launched before attempting screenshot
      if (!(await this.browser.isBrowserAlive())) {
        this.logger.info('Browser not launched yet, skipping screenshot');
        return;
      }
      const { originalSize, screenshotTime, compressedSize, compressedBase64, currentUrl } =
        await this.screenshot();

      this.currentScreenshot = compressedBase64;

      // Calculate compression ratio and percentage
      const compressionRatio = originalSize / compressedSize;
      const compressionPercentage = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      // Log compression stats
      this.logger.info('Screenshot compression stats:', {
        original: formatBytes(originalSize),
        compressed: formatBytes(compressedSize),
        ratio: `${compressionRatio.toFixed(2)}x (${compressionPercentage}% smaller)`,
        dimensions: `${this.screenWidth}x${this.screenHeight}`,
        format: 'webp',
        quality: 20,
        time: `${screenshotTime} ms`,
        url: currentUrl,
      });

      // Calculate image size
      const sizeInKB = (compressedSize / 1024).toFixed(2);

      // FIXME: using logger
      console.log('Screenshot info:', {
        width: this.screenWidth,
        height: this.screenHeight,
        size: `${sizeInKB} KB`,
        time: `${screenshotTime} ms`,
        url: currentUrl,
        compression: `${
          originalSize / 1024 > 1024
            ? (originalSize / 1024 / 1024).toFixed(2) + ' MB'
            : (originalSize / 1024).toFixed(2) + ' KB'
        } → ${formatBytes(compressedSize)} (${compressionPercentage}% reduction)`,
      });

      // Send screenshot to event stream as environment input
      const event = eventStream.createEvent('environment_input', {
        content: [
          {
            type: 'image_url',
            image_url: {
              url: compressedBase64,
            },
          },
        ],
        description: 'Browser Screenshot',
        metadata: {
          type: 'screenshot',
          url: currentUrl,
        },
      });

      eventStream.sendEvent(event);

      // Also capture page content on loop start
      // await this.capturePageContentAsEnvironmentInfo();
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${error}`);

      // Don't throw the error to prevent loop interruption
    }
  }

  /**
   * Add data URI prefix to base64 image if not present
   */
  private addBase64ImagePrefix(base64: string): string {
    if (!base64) return '';
    return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  }

  /**
   * Parse operation string into a structured operation object
   */
  private parseAction(actionString: string): PredictionParsed {
    // Normalize the action string - fix common formatting issues
    const normalizedString = actionString.trim();

    // Extract operation type
    const actionTypeMatch = normalizedString.match(/^(\w+)\(/);
    const action_type = actionTypeMatch ? actionTypeMatch[1] : '';

    const action_inputs: ActionInputs = {};

    // Handle coordinate points with flexible matching
    // This handles both complete and incomplete point formats
    const pointPatterns = [
      /point='<point>([\d\s]+)<\/point>'/, // Complete format: point='<point>892 351</point>'
      /point='<point>([\d\s]+)<\/point>/, // Missing closing quote: point='<point>892 351</point>
      /point='<point>([\d\s]+)/, // Missing closing tag and quote: point='<point>892 351
    ];

    let pointMatch = null;
    for (const pattern of pointPatterns) {
      pointMatch = normalizedString.match(pattern);
      if (pointMatch) break;
    }

    if (pointMatch) {
      const coords = pointMatch[1].trim().split(/\s+/).map(Number);
      if (coords.length >= 2) {
        const [x, y] = coords;
        action_inputs.start_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
      }
    }

    // Handle start and end coordinates (for drag operations)
    const startPointPatterns = [
      /start_point='<point>([\d\s]+)<\/point>'/,
      /start_point='<point>([\d\s]+)<\/point>/,
      /start_point='<point>([\d\s]+)/,
    ];

    let startPointMatch = null;
    for (const pattern of startPointPatterns) {
      startPointMatch = normalizedString.match(pattern);
      if (startPointMatch) break;
    }

    if (startPointMatch) {
      const coords = startPointMatch[1].trim().split(/\s+/).map(Number);
      if (coords.length >= 2) {
        const [x, y] = coords;
        action_inputs.start_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
      }
    }

    const endPointPatterns = [
      /end_point='<point>([\d\s]+)<\/point>'/,
      /end_point='<point>([\d\s]+)<\/point>/,
      /end_point='<point>([\d\s]+)/,
    ];

    let endPointMatch = null;
    for (const pattern of endPointPatterns) {
      endPointMatch = normalizedString.match(pattern);
      if (endPointMatch) break;
    }

    if (endPointMatch) {
      const coords = endPointMatch[1].trim().split(/\s+/).map(Number);
      if (coords.length >= 2) {
        const [x, y] = coords;
        action_inputs.end_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
      }
    }

    // Handle content parameter (for type and finished operations)
    const contentPatterns = [
      /content='((?:[^'\\]|\\.)*)'/, // Complete format with closing quote
      /content='((?:[^'\\]|\\.)*)/, // Missing closing quote
    ];

    let contentMatch = null;
    for (const pattern of contentPatterns) {
      contentMatch = normalizedString.match(pattern);
      if (contentMatch) break;
    }

    if (contentMatch) {
      // Process escape characters
      action_inputs.content = contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
    }

    // Handle keys and hotkeys
    const keyPatterns = [
      /key='([^']*)'/, // Complete format
      /key='([^']*)/, // Missing closing quote
    ];

    let keyMatch = null;
    for (const pattern of keyPatterns) {
      keyMatch = normalizedString.match(pattern);
      if (keyMatch) break;
    }

    if (keyMatch) {
      action_inputs.key = keyMatch[1];
    }

    // Handle scroll direction
    const directionPatterns = [
      /direction='([^']*)'/, // Complete format
      /direction='([^']*)/, // Missing closing quote
    ];

    let directionMatch = null;
    for (const pattern of directionPatterns) {
      directionMatch = normalizedString.match(pattern);
      if (directionMatch) break;
    }

    if (directionMatch) {
      action_inputs.direction = directionMatch[1];
    }

    return {
      action_type,
      action_inputs,
    };
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
      this.screenWidth = buffer.readUInt32BE(16);
      this.screenHeight = buffer.readUInt32BE(20);
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      // JPEG format: need to parse SOF0 marker (0xFFC0)
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;

        const marker = buffer[offset + 1];
        const segmentLength = buffer.readUInt16BE(offset + 2);

        // SOF0, SOF2 markers contain dimension information
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
          this.screenHeight = buffer.readUInt16BE(offset + 5);
          this.screenWidth = buffer.readUInt16BE(offset + 7);
          break;
        }

        offset += 2 + segmentLength;
      }
    }

    // Ensure dimensions were extracted
    if (!this.screenWidth || !this.screenHeight) {
      this.logger.warn('Unable to extract dimension information from image data');
    }
  }

  /**
   * Get access to the underlying Puppeteer page
   * This allows custom browser tools to be implemented
   * without relying on the MCP Browser server
   */
  async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    // Get active page or create a new one
    try {
      return await this.browser.getActivePage();
    } catch (error) {
      this.logger.warn('Failed to get active page, creating new page:', error);
      return await this.browser.createPage();
    }
  }
}
