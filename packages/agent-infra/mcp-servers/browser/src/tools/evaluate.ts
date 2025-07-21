import { z } from 'zod';
import { defineTool } from './defineTool.js';

const evaluateTool = defineTool({
  name: 'browser_evaluate',
  config: {
    description: 'Execute JavaScript in the browser console',
    inputSchema: {
      script: z
        .string()
        .describe('JavaScript code to execute, () => { /* code */ }'),
    },
  },
  handle: async (ctx, args) => {
    const { page, logger } = ctx;
    try {
      const result = await page.evaluate(`(${args.script})()`);
      logger.info('[browser_evaluate]', result);

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
      logger.error('Failed to browser_evaluate', error);
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
});

export default [evaluateTool];
