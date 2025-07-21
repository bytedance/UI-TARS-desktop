import { z } from 'zod';
import { defineTool } from './defineTool.js';
import { getTabList } from '../utils/browser.js';
import { store } from '../store.js';

const newTabTool = defineTool({
  name: 'browser_new_tab',
  config: {
    description: 'Open a new tab',
    inputSchema: {
      url: z.string().describe('URL to open in the new tab'),
    },
  },
  handle: async (ctx, args) => {
    const { browser, logger } = ctx;
    try {
      const newPage = await browser!.newPage();
      await newPage.goto(args.url, {
        waitUntil: [],
      });
      await newPage.bringToFront();

      // update global browser and page
      store.globalBrowser = browser;
      store.globalPage = newPage;
      return {
        content: [
          { type: 'text', text: `Opened new tab with URL: ${args.url}` },
        ],
        isError: false,
      };
    } catch (error) {
      logger.error('Failed to open new tab:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to open new tab: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

const tabListTool = defineTool({
  name: 'browser_tab_list',
  config: {
    description: 'Get the list of tabs',
    outputSchema: {
      tabList: z.array(
        z.object({
          index: z.number(),
          active: z.boolean(),
          title: z.string(),
          url: z.string(),
        }),
      ),
    },
  },
  handle: async (ctx) => {
    const {
      browser,
      page: activePage,
      currTabsIdx: activePageId,
      logger,
    } = ctx;
    try {
      const tabListList = await getTabList(browser, activePageId);
      const tabListSummary =
        tabListList?.length > 0
          ? `Current Tab: [${activePageId}] ${await activePage?.title()}\nAll Tabs: \n${tabListList
              .map(
                (tab) => `[${tab.index}] Title: ${tab.title} (URL: ${tab.url})`,
              )
              .join('\n')}`
          : '';
      return {
        content: [{ type: 'text', text: tabListSummary }],
        isError: false,
        structuredContent: {
          tabList: tabListList,
        },
      };
    } catch (error) {
      logger.error('Failed to browser_tab_list:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get tab list`,
          },
        ],
        structuredContent: {
          tabList: [],
        },
      };
    }
  },
});

const switchTabTool = defineTool({
  name: 'browser_switch_tab',
  config: {
    description: 'Switch to a specific tab',
    inputSchema: {
      index: z.number().describe('Tab index to switch to'),
    },
  },
  handle: async (ctx, args) => {
    const { browser, currTabsIdx: activePageId, logger } = ctx;
    try {
      const pages = await browser!.pages();
      if (args.index >= 0 && args.index < pages.length) {
        await pages[args.index].bringToFront();

        const tabListList = await getTabList(browser, activePageId);
        const tabListSummary =
          tabListList?.length > 0
            ? `All Tabs: \n${tabListList
                .map((tab) => `[${tab.index}] ${tab.title} (${tab.url})`)
                .join('\n')}`
            : '';

        return {
          content: [
            {
              type: 'text',
              text: `Switched to tab ${args.index}, ${tabListSummary}`,
            },
          ],
          isError: false,
        };
      }
      return {
        content: [{ type: 'text', text: `Invalid tab index: ${args.index}` }],
        isError: true,
      };
    } catch (error) {
      logger.error('Failed to browser_switch_tab:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to switch tab: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

const closeTabTool = defineTool({
  name: 'browser_close_tab',
  config: {
    description: 'Close the current tab',
  },
  handle: async (ctx) => {
    const { page, currTabsIdx, logger } = ctx;

    try {
      await page.close();
      if (page === store.globalPage) {
        store.globalPage = null;
      }
      return {
        content: [
          {
            type: 'text',
            text: `Closed current tab [${currTabsIdx}]`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      logger.error(`Failed to browser_close_tab: [${currTabsIdx}]`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to close tab [${currTabsIdx}]: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

export default [newTabTool, tabListTool, switchTabTool, closeTabTool];
