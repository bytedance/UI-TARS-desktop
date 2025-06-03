/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example to use models from "volcengine".
 */

import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@ui-tars/operator-browser';
import {
  Agent,
  AgentOptions,
  AgentRunNonStreamingOptions,
  AgentRunObjectOptions,
  ConsoleLogger,
  EventType,
  LogLevel,
  Tool,
  z,
} from '../../src';

export type Coords = [number, number] | [];
const factors: [number, number] = [1000, 1000];

export type ActionInputs = Partial<{
  content: string;
  start_box: string;
  end_box: string;
  key: string;
  hotkey: string;
  direction: string;
  start_coords: Coords;
  end_coords: Coords;
}>;

export interface PredictionParsed {
  /** `<action_inputs>` parsed from action_type(`action_inputs`) */
  action_inputs: ActionInputs;
  /** `<action_type>` parsed from `<action_type>`(action_inputs) */
  action_type: string;
}

const addBase64ImagePrefix = (base64: string) => {
  if (!base64) return '';

  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
};

class GUIAgent extends Agent {
  private browser: LocalBrowser;
  private browserOperator: BrowserOperator;
  private screenWidth?: number;
  private screenHeight?: number;

  private guiAgentTool = new Tool({
    id: 'browser_action_tool',
    description: `A browser tool to perform the next action to complete the task.

## Action Space

click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \", and \\n in content part to ensure we can parse the content in normal python string format.


## Note
- Use English in \`Thought\` part.
- Describe your detailed thought in \`Thought\` part.
- Describe your action in \`Step\` part.

`,

    parameters: z.object({
      thought: z
        .string()
        .describe(
          ' your observation and small plan in one sentence, DO NOT include " characters to avoid failure to render in JSON',
        ),
      step: z
        .string()
        .describe('Finally summarize the next action (with its target element) in one sentence'),
      action: z.string().describe('some action in action space like clike or press'),
    }),
    function: async ({ thought, step, action }) => {
      // @ts-expect-error
      const parsed = this.parseAction(action);
      console.log({ thought, step, action });
      console.log('parsed', JSON.stringify(parsed, null, 2));
      console.log('this.screenWidth', this.screenWidth);
      console.log('this.screenHeight', this.screenHeight);

      try {
        await this.browserOperator.execute({
          parsedPrediction: {
            ...parsed,
            // @ts-expect-error
            thought,
          },
          screenWidth: this.screenWidth!,
          screenHeight: this.screenHeight!,
        });
        return { action, status: 'success' };
      } catch (e) {
        this.logger.error(e);
        return {
          action,
          status: 'fail',
          error: e instanceof Error ? e.message : JSON.stringify(e),
        };
      }
    },
  });

  constructor(options: AgentOptions) {
    super(options);

    const logger = this.logger;
    this.browser = new LocalBrowser({
      logger,
    });

    logger.setLevel(LogLevel.DEBUG);
    this.browserOperator = new BrowserOperator({
      browser: this.browser,
      browserType: 'chrome',
      logger,
      highlightClickableElements: false,
      showActionInfo: false,
    });

    this.registerTool(this.browserGUIAgentTool);
  }

  async initialize() {
    /**
     * We not luanch browser in the replay run.
     */
    if (!this.isReplaySnapshot) {
      await this.browser.launch();
      const openingPage = await this.browser.createPage();
      await openingPage.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });

      // Disable google search suggestions overlay
      await openingPage.addStyleTag({
        content: '.aajZCb { display: none !important; }',
      });
    }

    // Call it to update the initialization state.
    super.initialize();
  }

  async onEachAgentLoopStart(sessionId: string) {
    // Record screenshot start time
    const startTime = performance.now();

    const output = this.isReplaySnapshot
      ? {
          base64: '/9j/4AAQSkZJRgABAQAA', // a mock jpeg.
          scaleFactor: 2,
        }
      : await this.browserOperator.screenshot();

    // Calculate screenshot time
    const endTime = performance.now();
    const screenshotTime = (endTime - startTime).toFixed(2);

    // Extract image dimensions from each screenshot
    this.extractImageDimensionsFromBase64(output.base64);

    // Calculate image size
    const base64Data = output.base64.replace(/^data:image\/\w+;base64,/, '');
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    console.log('Screenshot info:', {
      width: this.screenWidth,
      height: this.screenHeight,
      size: `${sizeInKB} KB`,
      time: `${screenshotTime} ms`,
    });

    // Create environment input event instead of user message
    const event = this.eventStream.createEvent(EventType.ENVIRONMENT_INPUT, {
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

    this.eventStream.sendEvent(event);
  }

  /**
   * Parse operation string into a structured operation object
   * Example: "click(point='<point>435 525</point>')" => { action_type: 'click', action_inputs: { start_box: '435 525' } }
   * @param actionString Operation string
   * @returns Parsed operation object
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
      action_inputs.start_box = `[${x / factors[0]},${y / factors[1]}]`;
    }

    // Handle start and end coordinates (for drag operations)
    const startPointMatch = actionString.match(/start_point='<point>([\d\s]+)<\/point>'/);
    if (startPointMatch) {
      const [x, y] = startPointMatch[1].split(' ').map(Number);
      action_inputs.start_box = `[${x / factors[0]},${y / factors[1]}]`;
    }

    const endPointMatch = actionString.match(/end_point='<point>([\d\s]+)<\/point>'/);
    if (endPointMatch) {
      const [x, y] = endPointMatch[1].split(' ').map(Number);
      action_inputs.end_box = `[${x / factors[0]},${y / factors[1]}]`;
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
      console.warn('Unable to extract dimension information from image data');
    }
  }
}

export const agent = new GUIAgent({
  instructions: `You are a GUI Agent, you are good at using browser_action_tool to solve user problems`,
  model: {
    use: {
      provider: 'volcengine',
      model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
      apiKey: process.env.ARK_API_KEY,
    },
    // TODO: Support Claude 3.7
    // use: {
    //   provider: 'azure-openai',
    //   baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    //   model: 'aws_sdk_claude37_sonnet',
    // },
  },
  toolCallEngine: 'structured_outputs',
  logLevel: LogLevel.DEBUG,
});

export const runOptions: AgentRunNonStreamingOptions = {
  input: [{ type: 'text', text: 'What is Agent TARS' }],
};

async function main() {
  await agent.initialize();

  const answer = await agent.run(runOptions);

  console.log(answer);
}

if (require.main === module) {
  main();
}
