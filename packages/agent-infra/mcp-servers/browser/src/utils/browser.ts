import { Browser, Page } from 'puppeteer-core';
import { LocalBrowser, RemoteBrowser } from '@agent-infra/browser';
import { PuppeteerBlocker } from '@ghostery/adblocker-puppeteer';
import { getBuildDomTreeScript } from '@agent-infra/browser-use';
import { parseProxyUrl, delayReject } from '../utils/utils.js';
import fetch from 'cross-fetch';
import { store } from '../store.js';

export const getCurrentPage = async (browser: Browser) => {
  const { logger } = store;

  const pages = await browser?.pages();
  // if no pages, create a new page
  if (!pages?.length)
    return { activePage: await browser?.newPage(), activePageId: 0 };

  let activePage = null;
  let activePageId = 0;
  for (let idx = pages.length - 1; idx >= 0; idx--) {
    const page = pages[idx];

    const isVisible = await Promise.race([
      page.evaluate(
        /* istanbul ignore next */ () => document.visibilityState === 'visible',
      ),
      delayReject(500),
    ]).catch((_) => false);

    const isHealthy = await Promise.race([
      page
        .evaluate(/* istanbul ignore next */ () => 1 + 1)
        .then((r) => r === 2),
      delayReject(500),
    ]).catch((_) => false);

    logger.debug(
      `[getCurrentPage]: page: ${page.url()}, pageId: ${idx}, isVisible: ${isVisible}, isHealthy: ${isHealthy}`,
    );

    // priority 1: use visible page
    if (isVisible) {
      activePage = page;
      activePageId = idx;
      break;
      // priority 2: use healthy page
    } else if (!isVisible && isHealthy) {
      activePage = page;
      activePageId = idx;
      continue;
    } else {
      logger.error(
        `page ${page.url()} is not visible and healthy, will close it`,
      );
      // page crash, create a new page
      await page.close();
    }
  }

  if (!activePage) {
    activePage = await browser?.newPage();
    await activePage.bringToFront();
    activePageId = 0;
  }

  return {
    activePage,
    activePageId,
  };
};

export const getTabList = async (browser: Browser) => {
  const pages = await browser?.pages();
  return await Promise.all(
    pages?.map(async (page, idx) => ({
      index: idx,
      title: await page.title(),
      url: await page.url(),
    })) || [],
  );
};

export async function ensureBrowser() {
  const { logger } = store;

  if (store.globalBrowser) {
    try {
      logger.info('starting to check if browser session is closed');
      const pages = await store.globalBrowser?.pages();
      if (!pages?.length) {
        throw new Error('browser session is closed');
      }
      logger.info(`detected browser session is still open: ${pages.length}`);
    } catch (error) {
      logger.warn(
        'detected browser session closed, will reinitialize browser',
        error,
      );
      store.globalBrowser = null;
      store.globalPage = null;
    }
  }

  // priority 2: use external browser from config if available
  if (!store.globalBrowser && store.globalConfig.externalBrowser) {
    store.globalBrowser =
      await store.globalConfig.externalBrowser?.getBrowser();
    logger.info('Using external browser instance');
  }

  // priority 3: create new browser and page
  if (!store.globalBrowser) {
    const browser = store.globalConfig.remoteOptions
      ? new RemoteBrowser(store.globalConfig.remoteOptions)
      : new LocalBrowser();
    await browser.launch(store.globalConfig.launchOptions);

    store.globalBrowser = browser.getBrowser();
  }
  let currTabsIdx = 0;

  if (!store.globalPage) {
    const pages = await store.globalBrowser?.pages();
    store.globalPage = pages?.[0];
    currTabsIdx = 0;
  } else {
    const { activePage, activePageId } = await getCurrentPage(
      store.globalBrowser,
    );
    store.globalPage = activePage || store.globalPage;
    currTabsIdx = activePageId || currTabsIdx;
  }

  if (store.globalConfig.contextOptions?.userAgent) {
    store.globalPage.setUserAgent(store.globalConfig.contextOptions.userAgent);
  }

  // inject the script to the page
  const injectScriptContent = getBuildDomTreeScript();
  await store.globalPage.evaluateOnNewDocument(injectScriptContent);

  if (store.globalConfig.enableAdBlocker) {
    try {
      await Promise.race([
        PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) =>
          blocker.enableBlockingInPage(store.globalPage as any),
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Blocking In Page timeout')), 1200),
        ),
      ]);
    } catch (e) {
      logger.error('Error enabling adblocker:', e);
    }
  }

  // set proxy authentication
  if (store.globalConfig.launchOptions?.proxy) {
    const proxy = parseProxyUrl(store.globalConfig.launchOptions?.proxy || '');
    if (proxy.username || proxy.password) {
      await store.globalPage.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    }
  }

  return {
    browser: store.globalBrowser,
    page: store.globalPage,
    currTabsIdx,
  };
}
