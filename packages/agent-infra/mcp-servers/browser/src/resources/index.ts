import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs';
import mime from 'mime-types';
import { isBinaryFile } from 'isbinaryfile';
import { ResourceContext } from '../typings.js';
import path from 'path';
import { store } from '../store.js';

const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();
const getScreenshots = () => screenshots;

export { consoleLogs, screenshots, getScreenshots };

export const registerResources = (server: McpServer, ctx: ResourceContext) => {
  const { logger } = ctx;

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
    'Browser Downloads',
    new ResourceTemplate('download://{name}', {
      list: undefined,
    }),
    async (uri, { name }) => {
      const { outputDir } = store.globalConfig;
      const fileName = Array.isArray(name) ? name[0] : name;
      const downloadedPath = path.join(outputDir!, fileName);
      logger.debug(`[Browser Downloads]: ${downloadedPath}`);

      if (!fs.existsSync(downloadedPath)) {
        return {
          contents: [],
        };
      }

      const mimeType = mime.lookup(fileName) || 'text/plain';
      const buffer = await fs.promises.readFile(downloadedPath);
      const isBinary = await isBinaryFile(downloadedPath);

      if (isBinary) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType,
              blob: buffer.toString('base64'),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType,
            text: buffer.toString('utf-8'),
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
