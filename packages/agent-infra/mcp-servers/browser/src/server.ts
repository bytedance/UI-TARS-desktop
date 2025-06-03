/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/puppeteer/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import os from 'node:os';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolResult,
  ImageContent,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { toMarkdown } from '@agent-infra/shared';
import { Logger, ConsoleLogger } from '@agent-infra/logger';
import { z } from 'zod';
import {
  LaunchOptions,
  LocalBrowser,
  Page,
  RemoteBrowser,
  RemoteBrowserOptions,
} from '@agent-infra/browser';
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
import merge from 'lodash.merge';
import {
  defineTools,
  parseProxyUrl,
  validateSelectorOrIndex,
} from './utils.js';
import { ElementHandle, KeyInput } from 'puppeteer-core';
import { keyInputValues } from './constants.js';
import { getVisionTools, visionToolsMap } from './tools/vision.js';
import {
  ContextOptions,
  ResourceContext,
  ToolContext,
  ToolDefinition,
} from './typings.js';
import {
  screenshots,
  getScreenshots,
  registerResources,
} from './resources/index.js';

interface GlobalConfig {
  /**
   * Browser launch options
   */
  launchOptions?: LaunchOptions;
  /**
   * Remote browser options
   */
  remoteOptions?: RemoteBrowserOptions;
  contextOptions?: ContextOptions;
  /**
   * Custom logger
   */
  logger?: Partial<Logger>;
  /**
   * Using a external browser instance.
   * @defaultValue true
   */
  externalBrowser?: LocalBrowser;
  /**
   * Whether to enable ad blocker
   * @defaultValue true
   */
  enableAdBlocker?: boolean;
  /**
   * Whether to add vision tools
   * @defaultValue false
   */
  vision?: boolean;
}

// Global state
let globalConfig: GlobalConfig = {
  launchOptions: {
    headless: os.platform() === 'linux' && !process.env.DISPLAY,
  },
  contextOptions: {},
  enableAdBlocker: true,
  vision: false,
};

let globalBrowser: LocalBrowser['browser'] | undefined;
let globalPage: Page | undefined;
let selectorMap: Map<number, DOMElementNode> | undefined;

const logger = (globalConfig?.logger ||
  new ConsoleLogger('[mcp-browser]')) as Logger;

const getCurrentPage = async (browser: LocalBrowser['browser']) => {
  const pages = await browser?.pages();
  // if no pages, create a new page
  if (!pages?.length)
    return { activePage: await browser?.newPage(), activePageId: 0 };

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

async function setConfig(config: GlobalConfig = {}) {
  globalConfig = merge({}, globalConfig, config);
  // logger.info('[setConfig] globalConfig', globalConfig);
}

async function setInitialBrowser(
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
    logger.info('Using global browser');
    globalBrowser = _browser;
  }
  if (_page) {
    globalPage = _page;
  }

  // priority 2: use external browser from config if available
  if (!globalBrowser && globalConfig.externalBrowser) {
    globalBrowser = await globalConfig.externalBrowser.getBrowser();
    logger.info('Using external browser instance');
  }

  // priority 3: create new browser and page
  if (!globalBrowser) {
    const browser = globalConfig.remoteOptions
      ? new RemoteBrowser(globalConfig.remoteOptions)
      : new LocalBrowser();
    await browser.launch(globalConfig.launchOptions);
    globalBrowser = browser.getBrowser();
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

  if (globalConfig.contextOptions?.userAgent) {
    globalPage?.setUserAgent(globalConfig.contextOptions.userAgent);
  }

  // inject the script to the page
  const injectScriptContent = getBuildDomTreeScript();
  await globalPage.evaluateOnNewDocument(injectScriptContent);

  if (globalConfig.enableAdBlocker) {
    try {
      await Promise.race([
        PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) =>
          blocker.enableBlockingInPage(globalPage as any),
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
  if (globalConfig?.launchOptions?.proxy) {
    const proxy = parseProxyUrl(globalConfig.launchOptions.proxy);
    if (proxy.username || proxy.password) {
      await globalPage.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    }
  }

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

export const toolsMap = defineTools({
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
      name: z.string().optional().describe('Name for the screenshot'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector for element to screenshot'),
      index: z
        .number()
        .optional()
        .describe('index of the element to screenshot'),
      width: z
        .number()
        .optional()
        .describe('Width in pixels (default: viewport width)'),
      height: z
        .number()
        .optional()
        .describe('Height in pixels (default: viewport height)'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Full page screenshot (default: false)'),
      highlight: z
        .boolean()
        .optional()
        .default(false)
        .describe('Highlight the element'),
    }),
  },
  browser_click: {
    name: 'browser_click',
    description:
      'Click an element on the page, before using the tool, use `browser_get_clickable_elements` to get the index of the element, but not call `browser_get_clickable_elements` multiple times',
    inputSchema: z.object({
      // selector: z
      //   .string()
      //   .optional()
      //   .describe('CSS selector for element to click'),
      index: z.number().optional().describe('Index of the element to click'),
    }),
  },
  browser_form_input_fill: {
    name: 'browser_form_input_fill',
    description:
      "Fill out an input field, before using the tool, Either 'index' or 'selector' must be provided",
    inputSchema: z.object({
      selector: z.string().optional().describe('CSS selector for input field'),
      index: z.number().optional().describe('Index of the element to fill'),
      value: z.string().describe('Value to fill'),
    }),
  },
  browser_select: {
    name: 'browser_select',
    description:
      "Select an element on the page with index, Either 'index' or 'selector' must be provided",
    inputSchema: z.object({
      index: z.number().optional().describe('Index of the element to select'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector for element to select'),
      value: z.string().describe('Value to select'),
    }),
  },
  browser_hover: {
    name: 'browser_hover',
    description:
      "Hover an element on the page, Either 'index' or 'selector' must be provided",
    inputSchema: z.object({
      index: z.number().optional().describe('Index of the element to hover'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector for element to hover'),
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
    description:
      'Get the HTML content of the current page, return long text is not friendly to models with limited token, recommended for use browser_get_markdown instead',
  },
  browser_get_clickable_elements: {
    name: 'browser_get_clickable_elements',
    description:
      "Get the clickable or hoverable or selectable elements on the current page, don't call this tool multiple times",
  },
  browser_get_text: {
    name: 'browser_get_text',
    description: 'Get the text content of the current page',
  },
  browser_get_markdown: {
    name: 'browser_get_markdown',
    description: 'Get the markdown content of the current page',
  },
  browser_read_links: {
    name: 'browser_read_links',
    description: 'Get all links on the current page',
  },
  browser_scroll: {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: z.object({
      amount: z
        .number()
        .optional()
        .describe(
          'Pixels to scroll (positive for down, negative for up), if the amount is not provided, scroll to the bottom of the page',
        ),
    }),
  },
  browser_go_back: {
    name: 'browser_go_back',
    description: 'Go back to the previous page',
  },
  browser_go_forward: {
    name: 'browser_go_forward',
    description: 'Go forward to the next page',
  },
  browser_tab_list: {
    name: 'browser_tab_list',
    description: 'Get the list of tabs',
  },
  browser_new_tab: {
    name: 'browser_new_tab',
    description: 'Open a new tab',
    inputSchema: z.object({
      url: z.string().describe('URL to open in the new tab'),
    }),
  },
  browser_close: {
    name: 'browser_close',
    description:
      'Close the browser when the task is done and the browser is not needed anymore',
  },
  browser_close_tab: {
    name: 'browser_close_tab',
    description: 'Close the current tab',
  },
  browser_switch_tab: {
    name: 'browser_switch_tab',
    description: 'Switch to a specific tab',
    inputSchema: z.object({
      index: z.number().describe('Tab index to switch to'),
    }),
  },
  browser_press_key: {
    name: 'browser_press_key',
    description: 'Press a key on the keyboard',
    inputSchema: z.object({
      key: z
        .enum(keyInputValues as [string, ...string[]])
        .describe(
          `Name of the key to press or a character to generate, such as ${keyInputValues.join(
            ', ',
          )}`,
        ),
    }),
  },
});

type ToolNames = keyof typeof toolsMap | keyof typeof visionToolsMap;
type ToolInputMap = {
  [K in ToolNames]: (typeof toolsMap & typeof visionToolsMap)[K] extends {
    inputSchema: infer S;
  }
    ? S extends z.ZodType<any, any, any>
      ? z.infer<S>
      : unknown
    : unknown;
};

async function buildDomTree(page: Page) {
  try {
    // check if the buildDomTree script is already injected
    const existBuildDomTreeScript = await page.evaluate(() => {
      return typeof window.buildDomTree === 'function';
    });
    if (!existBuildDomTreeScript) {
      const injectScriptContent = getBuildDomTreeScript();
      await page.evaluate(injectScriptContent);
    }

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

const handleToolCall = async ({
  name,
  arguments: toolArgs,
}: {
  name: string;
  arguments: ToolInputMap[keyof ToolInputMap];
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

  const ctx: ToolContext = {
    page,
    browser,
    logger,
    contextOptions: globalConfig.contextOptions || {},
  };

  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    // vision tools
    ...getVisionTools(ctx),
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
        await Promise.all([
          waitForPageAndFramesLoad(page),
          page.goto(args.url),
        ]);
        logger.info('navigateTo complete');
        const { clickableElements } = (await buildDomTree(page)) || {};
        await removeHighlights(page);
        return {
          content: [
            {
              type: 'text',
              text: `Navigated to ${args.url}\nclickable elements(Might be outdated, if an error occurs with the index element, use browser_get_clickable_elements to refresh it): ${clickableElements}`,
            },
          ],
          isError: false,
        };
      } catch (error: unknown) {
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
            content: [
              {
                type: 'text',
                text: `Navigation failed ${error instanceof Error ? error?.message : error}`,
              },
            ],
            isError: true,
          };
        }
      }
      // need to wait for the page to load
    },
    browser_screenshot: async (args) => {
      // if highlight is true, build the dom tree with highlights
      try {
        if (args.highlight) {
          await buildDomTree(page);
        } else {
          await removeHighlights(page);
        }
      } catch (error) {
        logger.warn('[browser_screenshot] Error building DOM tree:', error);
      }

      const width = args.width ?? page.viewport()?.width ?? 800;
      const height = args.height ?? page.viewport()?.height ?? 600;
      await page.setViewport({ width, height });

      let screenshot: string | undefined;
      if (args.selector) {
        screenshot = await (args.selector
          ? (await page.$(args.selector))?.screenshot({ encoding: 'base64' })
          : undefined);
      } else if (args.index !== undefined) {
        const elementNode = selectorMap?.get(Number(args?.index));
        const element = await locateElement(page, elementNode!);

        screenshot = await (element
          ? element.screenshot({ encoding: 'base64' })
          : undefined);
      }

      // if screenshot is still undefined, take a screenshot of the whole page
      screenshot =
        screenshot ||
        (await page.screenshot({
          encoding: 'base64',
          fullPage: args.fullPage ?? false,
        }));

      // if screenshot is still undefined, return an error
      if (!screenshot) {
        return {
          content: [
            {
              type: 'text',
              text: `Element not found: ${args.selector || args.index}`,
            },
          ],
          isError: true,
        };
      }

      const name = args?.name ?? 'undefined';

      screenshots.set(name, screenshot as string);

      const dimensions = args.fullPage
        ? await page.evaluate(() => ({
            width: Math.max(
              document.documentElement.scrollWidth,
              document.documentElement.clientWidth,
              document.body.scrollWidth,
            ),
            height: Math.max(
              document.documentElement.scrollHeight,
              document.documentElement.clientHeight,
              document.body.scrollHeight,
            ),
          }))
        : { width, height };

      return {
        content: [
          {
            type: 'text',
            text: args.fullPage
              ? `Screenshot of the whole page taken at ${dimensions.width}x${dimensions.height}`
              : `Screenshot '${name}' taken at ${dimensions.width}x${dimensions.height}`,
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
        await removeHighlights(page);
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
      try {
        let element: ElementHandle<Element> | null = null;
        if (args?.index !== undefined) {
          const elementNode = selectorMap?.get(Number(args?.index));
          if (elementNode?.highlightIndex !== undefined) {
            await removeHighlights(page);
          }

          element = await locateElement(page, elementNode!);
        }
        // else if (args.selector) {
        //   element = await page.$(args.selector);
        //   // locateElement
        //   await scrollIntoViewIfNeeded(element!);
        // }
        else {
          return {
            content: [
              {
                type: 'text',
                text: `Element index ${args?.index} not found`,
              },
            ],
            isError: true,
          };
        }

        try {
          // First attempt: Use Puppeteer's click method with timeout
          await Promise.race([
            element?.click(),
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
          logger.error('Failed to click element, trying again', error);
          try {
            await element?.evaluate((el) => (el as HTMLElement).click());
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
        if (args.index !== undefined) {
          const elementNode = selectorMap?.get(Number(args?.index));

          if (elementNode?.highlightIndex !== undefined) {
            await removeHighlights(page);
          }

          const element = await locateElement(page, elementNode!);

          if (!element) {
            return {
              content: [{ type: 'text', text: 'No form input found' }],
              isError: true,
            };
          }
          await element?.type(args.value);
        } else if (args.selector) {
          await page.waitForSelector(args.selector);
          await page.type(args.selector, args.value);
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'Either selector or index must be provided',
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Filled ${args.selector ? args.selector : args.index} with: ${args.value}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to fill ${args.selector ? args.selector : args.index}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_select: async (args) => {
      try {
        if (args.index !== undefined) {
          const elementNode = selectorMap?.get(Number(args?.index));

          if (elementNode?.highlightIndex !== undefined) {
            await removeHighlights(page);
          }

          const element = await locateElement(page, elementNode!);

          if (!element) {
            return {
              content: [{ type: 'text', text: 'No form input found' }],
              isError: true,
            };
          }

          await element?.select(args.value);
        } else if (args.selector) {
          await page.waitForSelector(args.selector);
          await page.select(args.selector, args.value);
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `No selector ${args.selector} or index ${args.index} provided`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Selected ${args.selector ? args.selector : args.index} with: ${args.value}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to select ${args.selector ? args.selector : args.index}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_hover: async (args) => {
      try {
        if (args.index !== undefined) {
          const elementNode = selectorMap?.get(Number(args?.index));

          if (elementNode?.highlightIndex !== undefined) {
            await removeHighlights(page);
          }

          const element = await locateElement(page, elementNode!);

          if (!element) {
            return {
              content: [{ type: 'text', text: 'No element found' }],
              isError: true,
            };
          }
          await element?.hover();
        } else if (args.selector) {
          await page.waitForSelector(args.selector);
          await page.hover(args.selector);
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `No selector ${args.selector} or index ${args.index} provided`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Hovered ${args.selector ? args.selector : args.index}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to hover ${args.selector ? args.selector : args.index}: ${(error as Error).message}`,
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
        const html = await page.content();
        const markdown = toMarkdown(html);
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
    browser_close: async (args) => {
      try {
        await browser?.close();
        globalBrowser = undefined;
        globalPage = undefined;

        return {
          content: [{ type: 'text', text: 'Closed browser' }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to close browser: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
    browser_close_tab: async (args) => {
      try {
        await page.close();
        if (page === globalPage) {
          globalPage = undefined;
        }
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
    browser_press_key: async (args) => {
      try {
        await page.keyboard.press(args.key as KeyInput);
        return {
          content: [{ type: 'text', text: `Pressed key: ${args.key}` }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Failed to press key: ${args.key}` }],
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

function createServer(config: GlobalConfig = {}): McpServer {
  setConfig(config);

  const server = new McpServer({
    name: 'Web Browser',
    version: process.env.VERSION || '0.0.1',
  });

  const mergedToolsMap: Record<string, ToolDefinition> = {
    ...toolsMap,
    ...(config.vision ? visionToolsMap : {}),
  };

  // === Tools ===
  Object.entries(mergedToolsMap).forEach(([name, tool]) => {
    // @ts-ignore
    if (tool?.inputSchema) {
      server.tool(
        name,
        tool.description,
        // @ts-ignore
        tool.inputSchema?.innerType
          ? // @ts-ignore
            tool.inputSchema.innerType().shape
          : // @ts-ignore
            tool.inputSchema?.shape,
        // @ts-ignore
        async (args) => await handleToolCall({ name, arguments: args }),
      );
    } else {
      server.tool(
        name,
        tool.description,
        async (args) => await handleToolCall({ name, arguments: args }),
      );
    }
  });

  const resourceCtx: ResourceContext = {
    logger,
    server,
  };

  // === Resources ===
  registerResources(resourceCtx);

  return server;
}

export {
  createServer,
  getScreenshots,
  setConfig,
  GlobalConfig,
  setInitialBrowser,
};
