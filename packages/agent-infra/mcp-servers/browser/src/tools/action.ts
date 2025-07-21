import { z } from 'zod';
import { defineTool } from './defineTool.js';
import { removeHighlights, locateElement } from '@agent-infra/browser-use';
import { store } from '../store.js';
import type { ElementHandle } from 'puppeteer-core';

const formInputFillTool = defineTool({
  name: 'browser_form_input_fill',
  config: {
    description:
      "Fill out an input field, before using the tool, Either 'index' or 'selector' must be provided",
    inputSchema: {
      selector: z
        .string()
        .optional()
        .describe(
          'CSS selector for input field, priority use index, if index is not provided, use selector',
        ),
      index: z.number().optional().describe('Index of the element to fill'),
      value: z.string().describe('Value to fill'),
      clear: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to clear existing text before filling'),
    },
  },
  handle: async (ctx, args) => {
    const { page, logger } = ctx;

    try {
      let element: ElementHandle<Element> | null = null;
      let targetIdentifier = '';

      if (args.index !== undefined) {
        const elementNode = store.selectorMap?.get(Number(args?.index));

        if (elementNode?.highlightIndex !== undefined) {
          await removeHighlights(page);
        }

        element = await locateElement(page, elementNode!);
        targetIdentifier = `index ${args.index}`;
      } else if (args.selector) {
        await page.waitForSelector(args.selector, {
          timeout: 15_000,
        });
        element = await page.$(args.selector);
        targetIdentifier = `selector ${args.selector}`;
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

      if (!element) {
        return {
          content: [
            {
              type: 'text',
              text: `No form input found for ${targetIdentifier}`,
            },
          ],
          isError: true,
        };
      }

      // https://stackoverflow.com/a/52633235/9722173
      if (args.clear) {
        await element.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
      }

      await element.type(args.value);

      const inputValue = await element.evaluate(
        /* istanbul ignore next */ (el: Element) => {
          return (el as HTMLInputElement)?.value || el?.textContent || '';
        },
      );

      logger.info('inputValue', inputValue);

      const isValidInput =
        args?.value === ''
          ? inputValue === ''
          : inputValue.includes(args.value);

      return {
        content: [
          {
            type: 'text',
            text: `${isValidInput ? 'Successfully' : 'Maybe failed'} filled ${targetIdentifier} with: "${args.value}"${args.clear ? ' (cleared existing text)' : ''}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      logger.error('Failed to browser_form_input_fill: ', args, error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to fill ${args.selector ? `selector ${args.selector}` : `index ${args.index}`}: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

export default [formInputFillTool];
