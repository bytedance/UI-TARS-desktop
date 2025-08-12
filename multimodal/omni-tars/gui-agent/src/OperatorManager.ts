import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { Operator } from '@ui-tars/sdk/dist/core';

export class OperatorManager {
  private operator: Operator;
  private browser: LocalBrowser;
  private initialized = false;

  constructor() {
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

  async init() {
    await this.browser.launch();
    const openingPage = await this.browser.createPage();
    await openingPage.goto('https://www.google.com/', {
      waitUntil: 'networkidle2',
    });
    this.initialized = true;
  }

  async getInstance() {
    if (!this.initialized) {
      await this.init();
    }
    return this.operator;
  }
}
