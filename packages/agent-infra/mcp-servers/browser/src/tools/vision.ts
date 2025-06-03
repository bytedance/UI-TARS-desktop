import {
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ToolContext } from '../typings.js';

type ToolNames = keyof typeof visionToolsMap;
type ToolInputMap = {
  [K in ToolNames]: (typeof visionToolsMap)[K] extends {
    inputSchema: infer S;
  }
    ? S extends z.ZodType<any, any, any>
      ? z.infer<S>
      : unknown
    : unknown;
};

export const visionToolsMap = {
  browser_vision_screen_capture: {
    description: 'Take a screenshot of the current page for vision mode',
  },
  browser_vision_screen_click: {
    description:
      'Click left mouse button on the page with vision and snapshot, before calling this tool, you should call `browser_vision_screen_capture` first only once, fallback to `browser_click` if failed',
    inputSchema: z.object({
      factors: z
        .array(z.number())
        .optional()
        .describe('Vision Model scaling factors, [width_scale, height_scale]'),
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
  },
};

export const getVisionTools = (ctx: ToolContext) => {
  const { page, logger } = ctx;

  const visionTools: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    browser_vision_screen_capture: async () => {
      const viewport = page.viewport();

      const screenshot = await page.screenshot({
        type: 'jpeg' as const,
        quality: 50,
        fullPage: false,
        omitBackground: false,
        encoding: 'base64',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot taken at ${viewport?.width}x${viewport?.height}`,
          } as TextContent,
          {
            type: 'image' as const,
            data: screenshot,
            mimeType: 'image/jpeg',
          },
        ],
      };
    },
    browser_vision_screen_click: async (args) => {
      try {
        let x = args.x;
        let y = args.y;

        if (args.factors) {
          const { actionParser } = await import('@ui-tars/action-parser');

          const viewport = page.viewport();
          const { parsed } = actionParser({
            prediction: `Action: click(start_box='(${args.x},${args.y})')`,
            factor: args.factors as [number, number],
            screenContext: {
              width: viewport?.width ?? 0,
              height: viewport?.height ?? 0,
            },
          });

          const { start_coords } = parsed?.[0]?.action_inputs ?? {};
          logger.info('[vision] start_coords', start_coords);

          x = start_coords?.[0] ?? x;
          y = start_coords?.[1] ?? y;
        }

        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.up();

        return {
          content: [
            {
              type: 'text',
              text: `Vision click at ${args.x}, ${args.y}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: 'Error clicking on the page' }],
          isError: true,
        };
      }
    },
  };
  return visionTools;
};
