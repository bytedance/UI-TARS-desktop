import { LocalBrowser, RemoteBrowser } from '@agent-infra/browser';
import { BrowserOperator, RemoteBrowserOperator } from '@gui-agent/operator-browser';
import { Operator } from '@ui-tars/sdk/dist/core';

import { AioClient, CDPVersionResp } from '@agent-infra/sandbox';

export class OperatorManager {
  private target: 'local' | 'remote';
  private aioClient: AioClient | null = null;
  private remoteOperator: Operator | null = null;
  private remoteBrowser: RemoteBrowser | null = null;
  private operator: Operator | null = null;
  private browser: LocalBrowser | null = null;
  private initialized = false;

  constructor(target: 'local' | 'remote') {
    this.target = target;
    if (this.target === 'remote') {
      this.aioClient = new AioClient({
        baseUrl: process.env.AIO_SANDBOX_URL!,
      });
    } else {
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
  }

  async init() {
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
    } else {
      await this.browser?.launch();
      const openingPage = await this.browser?.createPage();
      await openingPage?.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });
    }
    this.initialized = true;
  }

  async getInstance() {
    if (!this.initialized) {
      await this.init();
    }
    if (this.target === 'remote') {
      return this.remoteOperator;
    } else {
      return this.operator;
    }
  }

  getMode(): 'local' | 'remote' {
    return this.target;
  }

  static createLocal(): OperatorManager {
    return new OperatorManager('local');
  }

  static createRemote(): OperatorManager {
    return new OperatorManager('remote');
  }
}
