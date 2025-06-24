import { store } from './store.js';
import { ResourceContext, ToolContext } from './typings.js';
import { ensureBrowser } from './utils/browser.js';

export class Context {
  async getResourceContext(): Promise<ResourceContext> {
    return {
      logger: store.logger,
    };
  }

  async getToolContext(): Promise<ToolContext | null> {
    const { logger, globalConfig } = store;

    const initialBrowser = await ensureBrowser();
    const { browser } = initialBrowser;
    let { page } = initialBrowser;

    page.removeAllListeners('popup');
    page.on('popup', async (popup) => {
      if (popup) {
        logger.info(`popup page: ${popup.url()}`);
        await popup.bringToFront();
        page = popup;
        store.globalPage = popup;
      }
    });

    return {
      page,
      browser,
      logger,
      contextOptions: globalConfig.contextOptions || {},
    };
  }
}
