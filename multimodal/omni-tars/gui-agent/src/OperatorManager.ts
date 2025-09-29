import { LocalBrowser, RemoteBrowser } from '@agent-infra/browser';
import { BrowserOperator, RemoteBrowserOperator } from '@gui-agent/operator-browser';
import { AIOGameOperator, AIOHybridOperator } from '@gui-agent/operator-aio';
import { Operator } from '@gui-agent/shared/base';
import { AgentMode, getAioUrl } from '@omni-tars/core';
import { AioClient, CDPVersionResp } from '@agent-infra/sandbox';
import { defaultLogger } from '@agent-infra/logger';

export class OperatorManager {
  private agentMode: AgentMode;
  private aioClient: AioClient | null = null;
  private remoteOperator: Operator | null = null;
  private remoteBrowser: RemoteBrowser | null = null;
  private operator: Operator | null = null;
  private browser: LocalBrowser | null = null;
  private sandboxUrl: string;
  private initialized = false;

  constructor(agentMode: AgentMode, sandboxUrl?: string) {
    this.agentMode = agentMode;
    this.sandboxUrl = sandboxUrl ?? getAioUrl();

    if (this.agentMode.id === 'game') {
      const targetUrl = this.agentMode.link;
      if (!targetUrl) {
        defaultLogger.warn('Game agent mode link is null');
      }
      this.operator = new AIOGameOperator({
        baseURL: this.sandboxUrl,
        timeout: 10000,
        targetUrl,
      });
      this.initialized = true;
    } else {
      this.operator = new AIOHybridOperator({
        baseURL: this.sandboxUrl,
        timeout: 10000,
      });
    }

    /*
    if (this.target === 'remote') {
      this.aioClient = new AioClient({
        baseUrl: this.sandboxUrl
      });
    } else if (this.target === 'local') {
      const browser = new LocalBrowser();
      this.browser = browser;
      this.operator = new BrowserOperator({
        browser,
        browserType: 'chrome',
        logger: undefined,
        highlightClickableElements: false,
        showActionInfo: false,
      });
    }
    */
  }

  async init() {
    /*
    if (this.target === 'remote') {
      const cdpVersionResponse = await this.aioClient?.cdpVersion();
      const cdpVersion: CDPVersionResp = (cdpVersionResponse?.data ||
        cdpVersionResponse) as unknown as CDPVersionResp;
      console.log('cdpVersion of local aio sandbox', cdpVersion);
      const cdpUrl = cdpVersion?.webSocketDebuggerUrl;
      console.log('cdpUrl of local aio sandbox', cdpUrl);
      this.remoteOperator = await RemoteBrowserOperator.getInstance(cdpUrl);
      this.remoteBrowser = RemoteBrowserOperator.getRemoteBrowser();

      const openingPage = await this.remoteBrowser?.createPage();
      await openingPage?.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });
    } else if (this.target === 'local') {
      await this.browser?.launch();
      const openingPage = await this.browser?.createPage();
      await openingPage?.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });
    } else {
      this.operator = await AIOHybridOperator.create({
        baseURL: this.sandboxUrl,
        timeout: 10000,
      });
    }
    */
    await this.operator?.doInitialize();
    this.initialized = true;
  }

  async getInstance() {
    if (!this.initialized) {
      await this.init();
    }
    // if (this.target === 'remote') {
    //   return this.remoteOperator;
    // } else {
    //   return this.operator;
    // }
    return this.operator;
  }

  getMode(): AgentMode {
    return this.agentMode;
  }

  // static createLocal(): OperatorManager {
  //   return new OperatorManager('local');
  // }

  // static createRemote(sandboxUrl?: string): OperatorManager {
  //   return new OperatorManager('remote', sandboxUrl);
  // }

  static create(agentMode?: AgentMode, sandboxUrl?: string): OperatorManager {
    return new OperatorManager(agentMode ?? { id: 'gui', browserMode: 'hybrid' }, sandboxUrl);
  }
}
