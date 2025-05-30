/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@ui-tars/operator-browser';
import { ConsoleLogger, EventStream, Tool, ToolDefinition, z } from '@multimodal/mcp-agent';
import { EventType } from '@multimodal/mcp-agent';
import { Page } from 'puppeteer-core';

/**
 * Coordinate type definition
 */
export type Coords = [number, number] | [];

/**
 * Action input parameters for browser actions
 */
export interface ActionInputs {
  content?: string;
  start_box?: string;
  end_box?: string;
  key?: string;
  hotkey?: string;
  direction?: string;
  start_coords?: Coords;
  end_coords?: Coords;
}

function sleep(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

/**
 * Parsed prediction from GUI agent
 */
export interface PredictionParsed {
  /** Action inputs parsed from action_type(action_inputs) */
  action_inputs: ActionInputs;
  /** Action type parsed from action_type(action_inputs) */
  action_type: string;
  /** Thinking content */
  thought?: string;
}

/**
 * Browser initialization options
 */
export interface GUIAgentOptions {
  /** browser instance to use */
  browser: LocalBrowser;
  /** The logger instance to use */
  logger: ConsoleLogger;
  /** Whether to run browser in headless mode */
  headless?: boolean;
  /** Scaling factors for coordinates */
  factors?: [number, number];
  /** Event stream instance for injecting environment info */
  eventStream?: EventStream;
}

/**
 * Browser GUI Agent for visual browser automation
 */
export class BrowserGUIAgent {
  private browser: LocalBrowser;
  private browserOperator: BrowserOperator;
  private screenWidth?: number;
  private screenHeight?: number;
  private browserGUIAgentTool: ToolDefinition;
  private logger: ConsoleLogger;
  private factors: [number, number];
  private eventStream?: EventStream;

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
        // pageData: z
        //   .array(z.object({}))
        //   .describe("The information you see and extract from the page based on the user's query")
        //   .optional(),
      }),
      function: async ({ thought, step, action, pageData }) => {
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

          const result = await this.browserOperator.execute({
            parsedPrediction: parsed,
            screenWidth: this.screenWidth || 1920,
            screenHeight: this.screenHeight || 1080,
          });

          await sleep(500);

          // Automatically get page content after browser interaction
          // await this.capturePageContentAsEnvironmentInfo();

          return { action, status: 'success', result, pageData };
        } catch (error) {
          this.logger.error(
            `Browser action failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          return {
            action,
            status: 'fail',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    });
  }

  /**
   * Capture page content and add it to event stream as environment info
   * This is called automatically after each browser_vision_control action
   */
  private async capturePageContentAsEnvironmentInfo(): Promise<void> {
    // Only proceed if eventStream is provided
    if (!this.eventStream) return;

    try {
      const page = await this.getPage();

      // Get page content as markdown
      const markdown = await page.evaluate(() => {
        // Simple function to extract page content as markdown
        const extractMarkdown = () => {
          // Get page title
          const title = document.title || 'Untitled Page';

          // @ts-expect-error
          // Get visible text content
          const getVisibleText = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              return node.textContent || '';
            }

            const style = window.getComputedStyle(node);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.opacity === '0'
            ) {
              return '';
            }

            let text = '';
            for (const child of Array.from(node.childNodes)) {
              // @ts-expect-error
              if (child.nodeType === Node.ELEMENT_NODE) {
                text += getVisibleText(child);
                // @ts-expect-error
              } else if (child.nodeType === Node.TEXT_NODE) {
                // @ts-expect-error
                text += child.textContent || '';
              }
            }

            return text.trim();
          };

          // Get main content, prefer article or main elements
          const mainContent =
            document.querySelector('article, main, #content, .content') || document.body;
          const content = getVisibleText(mainContent);

          // Format as markdown
          return `# ${title}\n\n${content}`;
        };

        return extractMarkdown();
      });

      // If content is available, add it to event stream
      if (markdown && markdown.trim()) {
        // Create an environment input event with the markdown content
        const event = this.eventStream.createEvent(EventType.ENVIRONMENT_INPUT, {
          content: markdown,
          description: 'Page Content After Browser Action',
        });

        // Send the event
        this.eventStream.sendEvent(event);
        this.logger.debug('Added page content to event stream as environment info');
      }
    } catch (error) {
      // Log error but don't fail the main operation
      this.logger.warn(
        `Failed to capture page content: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set the event stream instance
   * @param eventStream - The event stream instance
   */
  public setEventStream(eventStream: EventStream): void {
    this.eventStream = eventStream;
  }

  /**
   * Get the tool definition for GUI Agent browser control
   */
  getToolDefinition(): ToolDefinition {
    return this.browserGUIAgentTool;
  }

  /**
   * Hook for starting each agent loop
   * - Takes a screenshot
   * - Extracts image dimensions
   * - Sends the screenshot to the event stream
   */
  async onEachAgentLoopStart(eventStream: EventStream, isReplaySnapshot = false): Promise<void> {
    console.log('Agent Loop Start');

    // Store the event stream for later use
    this.eventStream = eventStream;

    // Record screenshot start time
    const startTime = performance.now();

    // Handle replay state
    if (isReplaySnapshot) {
      // Send screenshot to event stream as environment input
      const event = eventStream.createEvent(EventType.ENVIRONMENT_INPUT, {
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQSk',
            },
          },
        ],
        description: 'Browser Screenshot',
      });

      return eventStream.sendEvent(event);
    }

    try {
      const output = await this.browserOperator.screenshot();

      // Calculate screenshot time
      const endTime = performance.now();
      const screenshotTime = (endTime - startTime).toFixed(2);

      // Extract image dimensions from screenshot
      this.extractImageDimensionsFromBase64(output.base64);

      // Calculate image size
      const base64Data = output.base64.replace(/^data:image\/\w+;base64,/, '');
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);

      // FIXME: using logger
      console.log('Screenshot info:', {
        width: this.screenWidth,
        height: this.screenHeight,
        size: `${sizeInKB} KB`,
        time: `${screenshotTime} ms`,
      });

      // Send screenshot to event stream as environment input
      const event = eventStream.createEvent(EventType.ENVIRONMENT_INPUT, {
        content: [
          {
            type: 'image_url',
            image_url: {
              url: this.addBase64ImagePrefix(output.base64),
            },
          },
        ],
        description: 'Browser Screenshot',
      });

      eventStream.sendEvent(event);

      // Also capture page content on loop start
      // await this.capturePageContentAsEnvironmentInfo();
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${error}`);
      throw error;
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
    // Extract operation type and parameter string
    const actionTypeMatch = actionString.match(/^(\w+)\(/);
    const action_type = actionTypeMatch ? actionTypeMatch[1] : '';

    const action_inputs: ActionInputs = {};

    // Handle coordinate points
    const pointMatch = actionString.match(/point='<point>([\d\s]+)<\/point>'/);
    if (pointMatch) {
      const [x, y] = pointMatch[1].split(' ').map(Number);
      action_inputs.start_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
    }

    // Handle start and end coordinates (for drag operations)
    const startPointMatch = actionString.match(/start_point='<point>([\d\s]+)<\/point>'/);
    if (startPointMatch) {
      const [x, y] = startPointMatch[1].split(' ').map(Number);
      action_inputs.start_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
    }

    const endPointMatch = actionString.match(/end_point='<point>([\d\s]+)<\/point>'/);
    if (endPointMatch) {
      const [x, y] = endPointMatch[1].split(' ').map(Number);
      action_inputs.end_box = `[${x / this.factors[0]},${y / this.factors[1]}]`;
    }

    // Handle content parameter (for type and finished operations)
    const contentMatch = actionString.match(/content='([^']*(?:\\.[^']*)*)'/);
    if (contentMatch) {
      // Process escape characters
      action_inputs.content = contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
    }

    // Handle keys and hotkeys
    const keyMatch = actionString.match(/key='([^']*)'/);
    if (keyMatch) {
      action_inputs.key = keyMatch[1];
    }

    // Handle scroll direction
    const directionMatch = actionString.match(/direction='([^']*)'/);
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
