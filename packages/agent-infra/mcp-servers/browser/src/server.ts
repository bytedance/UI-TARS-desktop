/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/puppeteer/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolResult,
  ImageContent,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';

import { Logger, BaseLogger } from '@agent-infra/logger';
import { z } from 'zod';
import { Page } from '@agent-infra/browser';
import { removeHighlights, locateElement } from '@agent-infra/browser-use';
import merge from 'lodash.merge';
import { defineTools, delay, getDownloadSuggestion } from './utils/utils.js';
import { Browser, ElementHandle, KeyInput } from 'puppeteer-core';
import { keyInputValues } from './constants.js';
import {
  GlobalConfig,
  ResourceContext,
  ToolContext,
  ToolDefinition,
} from './typings.js';
import {
  screenshots,
  getScreenshots,
  registerResources,
} from './resources/index.js';
import { store } from './store.js';
import { BrowserContext } from './context.js';

// tools
import visionTools from './tools/vision.js';
import downloadTools from './tools/download.js';
import navigateTools from './tools/navigate.js';
import contentTools from './tools/content.js';
import tabsTools from './tools/tabs.js';
import actionTools from './tools/action.js';
import evaluateTools from './tools/evaluate.js';

function setConfig(config: GlobalConfig = {}) {
  store.globalConfig = merge({}, store.globalConfig, config);
  if (config.logger) {
    store.logger = config.logger as Logger;
  }
}
function getConfig(): GlobalConfig {
  return store.globalConfig;
}

async function setInitialBrowser(
  _browser?: Browser,
  _page?: Page,
): Promise<{ browser: Browser; page: Page }> {
  const { logger } = store;

  // priority 1: use provided browser and page
  if (_browser) {
    logger.info('Using global browser');
    store.globalBrowser = _browser;
  }
  if (_page) {
    store.globalPage = _page;
  }

  return {
    browser: store.globalBrowser!,
    page: store.globalPage!,
  };
}

export const getBrowser = () => {
  return { browser: store.globalBrowser, page: store.globalPage };
};

export const toolsMap = defineTools({
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
  browser_get_clickable_elements: {
    name: 'browser_get_clickable_elements',
    description:
      "Get the clickable or hoverable or selectable elements on the current page, don't call this tool multiple times",
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
  browser_close: {
    name: 'browser_close',
    description:
      'Close the browser when the task is done and the browser is not needed anymore',
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

type ToolNames = keyof typeof toolsMap;
type ToolInputMap = {
  [K in ToolNames]: (typeof toolsMap)[K] extends {
    inputSchema: infer S;
  }
    ? S extends z.ZodType<any, any, any>
      ? z.infer<S>
      : unknown
    : unknown;
};

const handleToolCall = async (
  ctx: BrowserContext,
  {
    name,
    arguments: toolArgs,
  }: {
    name: string;
    arguments: ToolInputMap[keyof ToolInputMap];
  },
): Promise<CallToolResult> => {
  const toolCtx = await ctx.getToolContext();

  if (!toolCtx?.page) {
    return {
      content: [{ type: 'text', text: 'Page not found' }],
      isError: true,
    };
  }

  const { page, browser, logger } = toolCtx;

  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    browser_screenshot: async (args) => {
      // if highlight is true, build the dom tree with highlights
      try {
        if (args.highlight) {
          await ctx.buildDomTree(page);
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
        const elementNode = store.selectorMap?.get(Number(args?.index));
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
        ? await page.evaluate(
            /* istanbul ignore next */ () => ({
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
            }),
          )
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
        const { clickableElements } = (await ctx.buildDomTree(page)) || {};
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
        logger.error('Failed to browser_get_clickable_elements:', error);
        return {
          content: [{ type: 'text', text: (error as Error).message }],
          isError: true,
        };
      }
    },
    browser_click: async (args) => {
      try {
        const downloadsBefore = store.downloadedFiles.length;

        let element: ElementHandle<Element> | null = null;
        if (args?.index !== undefined) {
          const elementNode = store.selectorMap?.get(Number(args?.index));
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
          await Promise.race([
            element?.click(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Click timeout')), 5000),
            ),
          ]);

          await delay(200);

          const currentDownloadSuggestion = getDownloadSuggestion(
            downloadsBefore,
            store.downloadedFiles,
            store.globalConfig.outputDir!,
          );

          return {
            content: [
              {
                type: 'text',
                text: `Clicked element: ${args.index}${currentDownloadSuggestion}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          // Second attempt: Use evaluate to perform a direct click
          logger.error('Failed to click element, trying again', error);
          try {
            await element?.evaluate(
              /* istanbul ignore next */ (el) => (el as HTMLElement).click(),
            );

            await delay(200);

            const currentDownloadSuggestion = getDownloadSuggestion(
              downloadsBefore,
              store.downloadedFiles,
              store.globalConfig.outputDir!,
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Clicked element: ${args.index}${currentDownloadSuggestion}`,
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
        logger.error(`Failed to browser_click: ${args.index}`, error);
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
    browser_select: async (args) => {
      try {
        if (args.index !== undefined) {
          const elementNode = store.selectorMap?.get(Number(args?.index));

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
        logger.error(
          `Failed to browser_select: ${args.selector ? args.selector : args.index}`,
          error,
        );
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
          const elementNode = store.selectorMap?.get(Number(args?.index));

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
        logger.error(
          `Failed to hover: ${args.selector ? args.selector : args.index}`,
          error,
        );
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
    browser_scroll: async (args) => {
      try {
        const scrollResult = await page.evaluate(
          /* istanbul ignore next */ (amount) => {
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
          },
          args.amount,
        );

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
        logger.error(`Failed to browser_scroll: ${args.amount}`, error);
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
    browser_close: async (args) => {
      try {
        await browser?.close();

        store.globalBrowser = null;
        store.globalPage = null;
        store.downloadedFiles = [];
        store.initialBrowserSetDownloadBehavior = false;

        return {
          content: [{ type: 'text', text: 'Closed browser' }],
          isError: false,
        };
      } catch (error) {
        logger.error(`Failed to browser_close`, error);
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
    browser_press_key: async (args) => {
      try {
        await page.keyboard.press(args.key as KeyInput);
        return {
          content: [{ type: 'text', text: `Pressed key: ${args.key}` }],
          isError: false,
        };
      } catch (error) {
        logger.error(`Failed to browser_press_key`, error);
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

  // === Tools ===
  // Old
  const mergedToolsMap: Record<string, ToolDefinition> = {
    ...toolsMap,
  };

  const ctx = new BrowserContext();

  // New Tools
  const newTools = [
    ...navigateTools,
    ...actionTools,
    ...contentTools,
    ...tabsTools,
    ...evaluateTools,
    ...(config.vision ? visionTools : []),
    ...downloadTools,
  ];
  newTools.forEach((tool) => {
    server.registerTool(tool.name, tool.config as any, async (args) => {
      if (tool.skipToolContext) {
        return tool.handle(null, args);
      }

      const toolCtx = await ctx.getToolContext();

      if (!toolCtx?.page) {
        return {
          content: [{ type: 'text', text: 'Page not found' }],
          isError: true,
        };
      }

      // @ts-expect-error
      return tool.handle(toolCtx as ToolContext, args);
    });
  });

  // === Old Tools ===
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
        async (args) => await handleToolCall(ctx, { name, arguments: args }),
      );
    } else {
      server.tool(
        name,
        tool.description,
        async (args) => await handleToolCall(ctx, { name, arguments: args }),
      );
    }
  });

  const resourceCtx: ResourceContext = {
    logger: store.logger,
  };

  // === Resources ===
  registerResources(server, resourceCtx);

  return server;
}

export {
  BaseLogger,
  createServer,
  getScreenshots,
  setConfig,
  getConfig,
  type GlobalConfig,
  setInitialBrowser,
  BrowserContext,
};
