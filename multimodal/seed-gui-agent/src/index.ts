import { Agent, LLMRequestHookPayload, LogLevel, Tool } from '@multimodal/agent';
import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { SeedGUIAgentToolCallEngine } from './SeedGUIAgentToolCallEngine';
import { SYSTEM_PROMPT } from './constants';
import { getScreenInfo, setScreenInfo } from './shared';

const addBase64ImagePrefix = (base64: string) => {
  if (!base64) return '';
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
};

class BrowserGUIAgent extends Agent {
  private browser: LocalBrowser;
  private browserOperator: BrowserOperator;

  constructor() {
    super({
      name: 'Browser GUI Agent',
      instructions: SYSTEM_PROMPT,
      tools: [],
      toolCallEngine: SeedGUIAgentToolCallEngine,
      model: {
        provider: 'volcengine',
        id: 'ep-20250510145437-5sxhs',
        apiKey: process.env.ARK_API_KEY,
      },
      maxIterations: 10,
      logLevel: LogLevel.DEBUG,
    });

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
  }

  async initialize() {
    await this.browser.launch();

    const openingPage = await this.browser.createPage();
    await openingPage.goto('https://www.google.com/', {
      waitUntil: 'networkidle2',
    });

    this.registerTool(
      new Tool({
        id: 'browser-operation-tool',
        description: 'browser operation tool',
        // validate schema
        parameters: {},
        function: async (input) => {
          console.log(input);
          await this.browserOperator.execute({
            parsedPrediction: input,
            screenWidth: getScreenInfo().screenWidth,
            screenHeight: getScreenInfo().screenHeight,
          });
        },
      }),
    );
    super.initialize();
  }

  async onEachAgentLoopStart(sessionId: string) {
    const output = await this.browserOperator.screenshot();
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

export const agent = new BrowserGUIAgent();

async function main() {
  await agent.initialize();

  const response = await agent.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent Response:');
  console.log('================================================');
  console.log(response.content);
  console.log('================================================');
}

if (require.main === module) {
  main().catch(console.error);
}
