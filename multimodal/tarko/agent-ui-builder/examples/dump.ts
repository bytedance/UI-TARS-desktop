import { AgentUIBuilder, AgentEventStream } from '../src';
import { events } from './event-streams/jupyter-calculate.json';

const builder = new AgentUIBuilder({
  /**
   * Event Stream
   */
  events: events as unknown as AgentEventStream.Event[],
  /**
   * Session Information
   */
  sessionInfo: {
    id: 'sessionId',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspace: '~/workspace',
    metadata: {
      name: 'Use jupyter to calculate who is greater in 9.11 and 9.9',
      tags: [],
      modelConfig: {
        provider: 'volcengine',
        modelId: 'ep-20250905175225-hlrvd',
        displayName: 'UI-TARS-2',
        configuredAt: Date.now(),
      },
      agentInfo: {
        name: 'Omni Agent',
        configuredAt: Date.now(),
      },
    },
  },
  /**
   * Server Information
   */
  serverInfo: {
    version: '1.0.0',
    buildTime: Date.now(),
    gitHash: '1234567',
  },
  /**
   * UI Configuration
   */
  uiConfig: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'Omni Agent',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'A multimodal AI agent',
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});

function main() {
  // Generate HTML in memory
  const html = builder.dump('./index.html');
  console.log('Generated HTML:', html);
}

main();
