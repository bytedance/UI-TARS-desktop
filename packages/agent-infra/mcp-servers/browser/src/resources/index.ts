import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceContext } from '../typings.js';

const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();
const getScreenshots = () => screenshots;

export { consoleLogs, screenshots, getScreenshots };

export const registerResources = (ctx: ResourceContext) => {
  const { logger, server } = ctx;

  // === Resources ===
  server.resource(
    'Browser console logs',
    'console://logs',
    {
      mimeType: 'text/plain',
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            text: consoleLogs.join('\n'),
          },
        ],
      };
    },
  );

  server.resource(
    'Browser Screenshots',
    new ResourceTemplate('screenshot://{name}', {
      list: () => {
        const screenshots = getScreenshots();
        return {
          resources: Array.from(screenshots.keys()).map((name) => ({
            uri: `screenshot://${name}`,
            mimeType: 'image/png',
            name: `Screenshot: ${name}`,
          })),
        };
      },
    }),
    async (uri, { name }) => {
      const latestScreenshots = getScreenshots();
      const screenshots = (
        Array.isArray(name)
          ? name.map((n) => latestScreenshots.get(n))
          : [latestScreenshots.get(name)]
      ) as string[];

      return {
        contents: screenshots.filter(Boolean).map((screenshot) => ({
          uri: uri.href,
          mimeType: 'image/png',
          blob: screenshot,
        })),
      };
    },
  );
};
