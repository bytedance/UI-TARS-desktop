/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/puppeteer/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import {
  CallToolResult,
  ImageContent,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger, defaultLogger } from '@agent-infra/logger';
import { z } from 'zod';
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LaunchOptions, LocalBrowser, Page } from '@agent-infra/browser';
import { PuppeteerBlocker } from '@ghostery/adblocker-puppeteer';
import fetch from 'cross-fetch';
import {
  getBuildDomTreeScript,
  parseNode,
  type RawDomTreeNode,
  DOMElementNode,
  createSelectorMap,
  removeHighlights,
  waitForPageAndFramesLoad,
  locateElement,
  scrollIntoViewIfNeeded,
} from '@agent-infra/browser-use';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

interface GlobalConfig {
  launchOptions?: LaunchOptions;
  logger?: Partial<Logger>;
}

// Global state
let globalConfig: GlobalConfig = {
  launchOptions: {
    headless: true,
  },
};
let globalBrowser: LocalBrowser['browser'] | undefined;
let globalPage: Page | undefined;
let selectorMap: Map<number, DOMElementNode> | undefined;

const screenshots = new Map<string, string>();
const logger = (globalConfig?.logger || defaultLogger) as Logger;

export const getScreenshots = () => screenshots;

const getCurrentPage = async (browser: LocalBrowser['browser']) => {
  const pages = await browser?.pages();
  if (!pages?.length) return { activePage: undefined, activePageId: -1 };

  for (let i = 0; i < pages.length; i++) {
    try {
      const isVisible = await pages[i].evaluate(
        () => document.visibilityState === 'visible',
      );
      if (isVisible) {
        return {
          activePage: pages[i],
          activePageId: i,
        };
      }
    } catch (error) {
      continue;
    }
  }

  return {
    activePage: pages[0],
    activePageId: 0,
  };
};

export async function setConfig(config: GlobalConfig) {
  globalConfig = config;
}

export async function setInitialBrowser(
  _browser?: LocalBrowser['browser'],
  _page?: Page,
) {
  if (globalBrowser) {
    try {
      logger.info('starting to check if browser session is closed');
      const pages = await globalBrowser.pages();
      if (!pages.length) {
        throw new Error('browser session is closed');
      }
      logger.info(`detected browser session is still open: ${pages.length}`);
    } catch (error) {
      logger.warn(
        'detected browser session closed, will reinitialize browser',
        error,
      );
      globalBrowser = undefined;
      globalPage = undefined;
    }
  }

  // priority 1: use provided browser and page
  if (_browser) {
    globalBrowser = _browser;
  }
  if (_page) {
    globalPage = _page;
  }

  // priority 2: create new browser and page
  if (!globalBrowser) {
    const localBrowser = new LocalBrowser();
    await localBrowser.launch(globalConfig.launchOptions);
    globalBrowser = localBrowser.getBrowser();
  }
  let currTabsIdx = 0;

  if (!globalPage) {
    const pages = await globalBrowser.pages();
    globalPage = pages[0];
    currTabsIdx = 0;
  } else {
    const { activePage, activePageId } = await getCurrentPage(globalBrowser);
    globalPage = activePage || globalPage;
    currTabsIdx = activePageId || currTabsIdx;
  }

  // inject the script to the page
  const injectScriptContent = getBuildDomTreeScript();
  await globalPage.evaluateOnNewDocument(injectScriptContent);

  // TODO: randomize user agent
  globalPage?.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  );

  return {
    browser: globalBrowser,
    page: globalPage,
    currTabsIdx,
  };
}

const getTabList = async (browser: LocalBrowser['browser']) => {
  const pages = await browser?.pages();
  return await Promise.all(
    pages?.map(async (page, idx) => ({
      index: idx,
      title: await page.title(),
      url: await page.url(),
    })) || [],
  );
};

export const getBrowser = () => {
  return { browser: globalBrowser, page: globalPage };
};

declare global {
  interface Window {
    // @ts-ignore
    buildDomTree: (args: any) => any | null;
  }
}

export const toolsMap = {
  browser_navigate: {
    description: 'Navigate to a URL',
    inputSchema: z.object({
      url: z.string(),
    }),
  },
  browser_screenshot: {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page or a specific element',
    inputSchema: z.object({
      name: z.string().describe('Name for the screenshot'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector for element to screenshot'),
      width: z.number().optional().describe('Width in pixels (default: 800)'),
      height: z.number().optional().describe('Height in pixels (default: 600)'),
      highlight: z
        .boolean()
        .optional()
        .default(false)
        .describe('Highlight the element'),
    }),
  },
  browser_click: {
    name: 'browser_click',
    description: 'Click an element on the page',
    inputSchema: z
      .object({
        // selector: z
        //   .string()
        //   .optional()
        //   .describe('CSS selector for element to click'),
        index: z.number().optional().describe('Index of the element to click'),
      })
      .refine((obj) => Object.keys(obj).length > 0, {
        message:
          'clickable element must have at least one of selector or index',
      }),
  },
  browser_form_input_fill: {
    name: 'browser_form_input_fill',
    description: 'Fill out an input field',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for input field'),
      value: z.string().describe('Value to fill'),
    }),
  },
  browser_select: {
    name: 'browser_select',
    description: 'Select an element on the page with Select tag',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for element to select'),
      value: z.string().describe('Value to select'),
    }),
  },
  browser_hover: {
    name: 'browser_hover',
    description: 'Hover an element on the page',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for element to hover'),
    }),
  },
  browser_evaluate: {
    name: 'browser_evaluate',
    description: 'Execute JavaScript in the browser console',
    inputSchema: z.object({
      script: z.string().describe('JavaScript code to execute'),
    }),
  },
  // new tools
  browser_get_html: {
    name: 'browser_get_html',
    description: 'Get the HTML content of the current page',
    inputSchema: z.object({}),
  },
  browser_get_clickable_elements: {
    name: 'browser_get_clickable_elements',
    description: 'Get the clickable elements on the current page',
    inputSchema: z.object({}),
  },
  browser_get_text: {
    name: 'browser_get_text',
    description: 'Get the text content of the current page',
    inputSchema: z.object({}),
  },
  browser_get_markdown: {
    name: 'browser_get_markdown',
    description: 'Get the markdown content of the current page',
    inputSchema: z.object({}),
  },
  browser_read_links: {
    name: 'browser_read_links',
    description: 'Get all links on the current page',
    inputSchema: z.object({}),
  },
  browser_scroll: {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: z.object({
      amount: z
        .number()
        .describe('Pixels to scroll (positive for down, negative for up)'),
    }),
  },
  browser_go_back: {
    name: 'browser_go_back',
    description: 'Go back to the previous page',
    inputSchema: z.object({}),
  },
  browser_go_forward: {
    name: 'browser_go_forward',
    description: 'Go forward to the next page',
    inputSchema: z.object({}),
  },
  browser_tab_list: {
    name: 'browser_tab_list',
    description: 'Get the list of tabs',
    inputSchema: z.object({}),
  },
  browser_new_tab: {
    name: 'browser_new_tab',
    description: 'Open a new tab',
    inputSchema: z.object({
      url: z.string().describe('URL to open in the new tab'),
    }),
  },
  browser_close_tab: {
    name: 'browser_close_tab',
    description: 'Close the current tab',
    inputSchema: z.object({}),
  },
  browser_switch_tab: {
    name: 'browser_switch_tab',
    description: 'Switch to a specific tab',
    inputSchema: z.object({
      index: z.number().describe('Tab index to switch to'),
    }),
  },
};

type ToolNames = keyof typeof toolsMap;
type ToolInputMap = {
  [K in ToolNames]: z.infer<(typeof toolsMap)[K]['inputSchema']>;
};

const listTools: Client['listTools'] = async () => {
  const mcpTools = Object.keys(toolsMap || {}).map((key) => {
    const name = key as ToolNames;
    const tool = toolsMap[name];
    return {
      // @ts-ignore
      name: tool?.name || name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as ToolInput,
    };
  });

  return {
    tools: mcpTools,
  };
};

async function buildDomTree(page: Page) {
  try {
    const rawDomTree = await page.evaluate(() => {
      // Access buildDomTree from the window context of the target page
      return window.buildDomTree({
        doHighlightElements: true,
        focusHighlightIndex: -1,
        viewportExpansion: 0,
      });
    });
    if (rawDomTree !== null) {
      const elementTree = parseNode(rawDomTree as RawDomTreeNode);
      if (elementTree !== null && elementTree instanceof DOMElementNode) {
        const clickableElements = elementTree.clickableElementsToString();
        selectorMap = createSelectorMap(elementTree);

        return {
          clickableElements,
          elementTree,
          selectorMap,
        };
      }
    }
    return null;
  } catch (error) {
    logger.error('Error building DOM tree:', error);
    return null;
  }
}

const handleToolCall: Client['callTool'] = async ({
  name,
  arguments: toolArgs,
}): Promise<CallToolResult> => {
  const initialBrowser = await setInitialBrowser();
  const { browser } = initialBrowser;
  let { page } = initialBrowser;

  if (!page) {
    return {
      content: [{ type: 'text', text: 'Page not found' }],
      isError: true,
    };
  }

  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    browser_go_back: async (args) => {
      try {
        await Promise.all([waitForPageAndFramesLoad(page), page.goBack()]);
        logger.info('Navigation back completed');
        return {
          content: [{ type: 'text', text: 'Navigated back' }],
          isError: false,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          logger.warn(
            'Back navigation timeout, but page might still be usable:',
            error,
          );
          return {
            content: [
              {
                type: 'text',
                text: 'Back navigation timeout, but page might still be usable:',
              },
            ],
            isError: false,
          };
        } else {
          logger.error('Could not navigate back:', error);
          return {
            content: [
              {
                type: 'text',
                text: 'Could not navigate back',
              },
            ],
            isError: true,
          };
        }
      }
    },
    browser_go_forward: async (args) => {
      try {
        await Promise.all([waitForPageAndFramesLoad(page), page.goForward()]);
        logger.info('Navigation back completed');
        return {
          content: [{ type: 'text', text: 'Navigated forward' }],
          isError: false,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          logger.warn(
            'forward navigation timeout, but page might still be usable:',
            error,
          );
          return {
            content: [
              {
                type: 'text',
                text: 'forward navigation timeout, but page might still be usable:',
              },
            ],
            isError: false,
          };
        } else {
          logger.error('Could not navigate forward:', error);
          return {
            content: [
              {
                type: 'text',
                text: 'Could not navigate forward',
              },
            ],
            isError: true,
          };
        }
      }
    },
    browser_navigate: async (args) => {
      try {
        try {
          const blocker =
            await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
          await blocker.enableBlockingInPage(page as any);
        } catch (e) {
          logger.error('Error enabling adblocker:', e);
        }

        await Promise.all([
          waitForPageAndFramesLoad(page),
          page.goto(args.url),
        ]);
        logger.info('navigateTo complete');
        const { clickableElements } = (await buildDomTree(page)) || {};
        return {
          content: [
            {
              type: 'text',
              text: `Navigated to ${args.url}\nclickable elements: ${clickableElements}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        // Check if it's a timeout error
        if (error instanceof Error && error.message.includes('timeout')) {
          logger.warn(
            'Navigation timeout, but page might still be usable:',
            error,
          );
          // You might want to check if the page is actually loaded despite the timeout
          return {
            content: [
              {
                type: 'text',
                text: 'Navigation timeout, but page might still be usable:',
              },
            ],
            isError: false,
          };
        } else {
          logger.error('NavigationTo failed:', error);
          return {
            content: [{ type: 'text', text: 'Navigation failed' }],
            isError: true,
          };
        }
      }
      // need to wait for the page to load
    },
    browser_screenshot: async (args) => {
      // if highlight is true, build the dom tree with highlights
      if (args.highlight) {
        await buildDomTree(page);
      } else {
        await removeHighlights(page);
      }
      const width = args.width ?? page.viewport()?.width ?? 800;
      const height = args.height ?? page.viewport()?.height ?? 600;
      await page.setViewport({ width, height });

      const screenshot = await (args.selector
        ? (await page.$(args.selector))?.screenshot({ encoding: 'base64' })
        : page.screenshot({ encoding: 'base64', fullPage: false }));

      if (!screenshot) {
        return {
          content: [
            {
              type: 'text',
              text: args.selector
                ? `Element not found: ${args.selector}`
                : 'Screenshot failed',
            },
          ],
          isError: true,
        };
      }

      screenshots.set(args.name, screenshot as string);

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot '${args.name}' taken at ${width}x${height}`,
          } as TextContent,
          {
            type: 'image',
            data: screenshot,
            mimeType: 'image/png',
          } as ImageContent,
        ],
        isError: false,
      };
    },
    browser_get_clickable_elements: async (args) => {
      if (!page) {
        return {
          content: [{ type: 'text', text: 'Page not found' }],
          isError: true,
        };
      }

      try {
        const { clickableElements } = (await buildDomTree(page)) || {};
        if (clickableElements) {
          return {
            content: [
              {
                type: 'text',
                text: clickableElements,
              },
            ],
            isError: false,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to parse DOM tree',
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: (error as Error).message }],
          isError: true,
        };
      }
    },
    browser_click: async (args) => {
      if (!args.index) {
        return {
          content: [{ type: 'text', text: 'No index provided' }],
          isError: true,
        };
      }

      try {
        const elementNode = selectorMap?.get(Number(args?.index));

        if (elementNode?.highlightIndex !== undefined) {
          await removeHighlights(page);
          // const { selectorMap: newSelectorMap } =
          //   (await buildDomTree(page)) || {};
          // elementNode = newSelectorMap?.get(Number(args?.index));
        }

        const element = await locateElement(page, elementNode!);

        if (!element) {
          return {
            content: [
              {
                type: 'text',
                text: `Element ${args?.index} not found`,
              },
            ],
            isError: true,
          };
        }

        await scrollIntoViewIfNeeded(element);

        try {
          // First attempt: Use Puppeteer's click method with timeout
          await Promise.race([
            element.click(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Click timeout')), 5000),
            ),
          ]);
          return {
            content: [
              {
                type: 'text',
                text: `Clicked element: ${args.index}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          // Second attempt: Use evaluate to perform a direct click
          logger.info('Failed to click element, trying again', error);
          try {
            await element.evaluate((el) => (el as HTMLElement).click());
            return {
              content: [
                {
                  type: 'text',
                  text: `Clicked element: ${args.index}`,
                },
              ],
              isError: false,
            };
          } catch (secondError) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to click element: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
                },
              ],
              isError: true,
            };
          }
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to click element: ${args.index}. Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
    browser_form_input_fill: async (args) => {
      try {
        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        return {
          content: [
            {
              type: 'text',
              text: `Filled ${args.selector} with: ${args.value}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_select: async (args) => {
      try {
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
          content: [
            {
              type: 'text',
              text: `Selected ${args.selector} with: ${args.value}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to select ${args.selector}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_hover: async (args) => {
      try {
        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        return {
          content: [
            {
              type: 'text',
              text: `Hovered ${args.selector}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_evaluate: async (args) => {
      try {
        await page.evaluate(() => {
          window.mcpHelper = {
            logs: [],
            originalConsole: { ...console },
          };

          ['log', 'info', 'warn', 'error'].forEach((method) => {
            (console as any)[method] = (...args: any[]) => {
              window.mcpHelper.logs.push(`[${method}] ${args.join(' ')}`);
              (window.mcpHelper.originalConsole as any)[method](...args);
            };
          });
        });

        const result = await page.evaluate(args.script);

        const logs = await page.evaluate(() => {
          Object.assign(console, window.mcpHelper.originalConsole);
          const logs = window.mcpHelper.logs;
          delete (window as any).mcpHelper;
          return logs;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Execution result:\n${JSON.stringify(result, null, 2)}\n`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Script execution failed: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_get_html: async (args) => {
      try {
        const html = await page.content();
        return {
          content: [{ type: 'text', text: html }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get HTML: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_get_text: async (args) => {
      try {
        const text = await page.evaluate(() => document.body.innerText);
        return {
          content: [{ type: 'text', text }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get text: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_get_markdown: async (args) => {
      try {
        const turndownService = new TurndownService();
        turndownService.addRule('filter_tags', {
          filter: ['script', 'style'],
          replacement: (content) => {
            return '';
          },
        });
        turndownService.use(gfm);

        const html = await page.content();
        const markdown = turndownService.turndown(html);
        return {
          content: [{ type: 'text', text: markdown }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get markdown: ${(error as Error).message}`,
            },
          ],
        };
      }
    },
    browser_read_links: async (args) => {
      try {
        const links = await page.evaluate(() => {
          const linkElements = document.querySelectorAll('a[href]');
          return Array.from(linkElements).map((el) => ({
            text: (el as HTMLElement).innerText,
            href: el.getAttribute('href'),
          }));
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(links, null, 2) }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to read links: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_scroll: async (args) => {
      try {
        const scrollResult = await page.evaluate((amount) => {
          const beforeScrollY = window.scrollY;
          if (amount) {
            window.scrollBy(0, amount);
          } else {
            window.scrollBy(0, window.innerHeight);
          }

          // check if the page is scrolled the expected distance
          const actualScroll = window.scrollY - beforeScrollY;

          // check if the page is at the bottom
          const scrollHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
          );
          const scrollTop = window.scrollY;
          const clientHeight =
            window.innerHeight || document.documentElement.clientHeight;
          const isAtBottom =
            Math.abs(scrollHeight - scrollTop - clientHeight) <= 1;

          return {
            actualScroll,
            isAtBottom,
          };
        }, args.amount);

        return {
          content: [
            {
              type: 'text',
              text: `Scrolled ${scrollResult.actualScroll} pixels. ${
                scrollResult.isAtBottom
                  ? 'Reached the bottom of the page.'
                  : 'Did not reach the bottom of the page.'
              }`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to scroll: ${args.amount}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_new_tab: async (args) => {
      try {
        const newPage = await browser!.newPage();
        await newPage.goto(args.url);
        page = newPage;
        await setInitialBrowser(browser, newPage);
        return {
          content: [
            { type: 'text', text: `Opened new tab with URL: ${args.url}` },
          ],
          isError: false,
        };
      } catch (error) {
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
    browser_close_tab: async (args) => {
      try {
        await page.close();
        return {
          content: [{ type: 'text', text: 'Closed current tab' }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to close tab: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_tab_list: async (args) => {
      try {
        const tabListList = await getTabList(browser);
        const { activePageId, activePage } = await getCurrentPage(browser);
        const tabListSummary =
          tabListList?.length > 0
            ? `Current Tab: [${activePageId}] ${await activePage?.title()}\nAll Tabs: \n${tabListList
                .map((tab) => `[${tab.index}] ${tab.title} (${tab.url})`)
                .join('\n')}`
            : '';
        return {
          content: [{ type: 'text', text: tabListSummary }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get tab list`,
            },
          ],
        };
      }
    },
    browser_switch_tab: async (args) => {
      try {
        const pages = await browser!.pages();
        if (args.index >= 0 && args.index < pages.length) {
          await pages[args.index].bringToFront();

          const tabListList = await getTabList(browser);
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
  };

  if (handlers[name as ToolNames]) {
    return handlers[name as ToolNames](toolArgs as any);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
};

const close = async () => {
  const { browser } = getBrowser();
  await browser?.close();
};

// https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/utilities/ping/#behavior-requirements
const ping: Client['ping'] = async () => {
  return {
    _meta: {},
  };
};

export const client: Pick<Client, 'callTool' | 'listTools' | 'close' | 'ping'> =
  {
    callTool: handleToolCall,
    listTools: listTools,
    close,
    ping,
  };
