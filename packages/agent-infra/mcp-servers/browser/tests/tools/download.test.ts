import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, type GlobalConfig } from '../../src/server.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanUp = (testOutputDir: string) => {
  if (fs.existsSync(testOutputDir)) {
    const files = fs.readdirSync(testOutputDir);
    for (const file of files) {
      const filePath = path.join(testOutputDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }
};

describe('Browser Download Tests', () => {
  let client: Client;
  let testOutputDir: string;

  beforeAll(async () => {
    testOutputDir = path.join(__dirname, '../__fixtures__');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    cleanUp(testOutputDir);
  });

  afterAll(async () => {
    cleanUp(testOutputDir);
  });

  beforeEach(async () => {
    client = new Client(
      {
        name: 'download test client',
        version: '1.0',
      },
      {
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
      },
    );

    const server = createServer({
      launchOptions: {
        headless: true,
      },
      outputDir: testOutputDir,
    } as GlobalConfig);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterEach(async () => {
    try {
      await client.callTool({
        name: 'browser_close',
      });
    } catch (error) {
      console.warn('Error closing browser in afterEach:', error);
    }
    await client.close();
  });

  test(
    'should download file and read content via resource',
    {
      timeout: 30000,
    },
    async () => {
      const htmlContent = `<a href="data:text/plain,Hello world!" download="test.txt">Download</a>`;
      const dataUrl = `data:text/html,${encodeURIComponent(htmlContent)}`;

      const navigateResult = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: dataUrl,
        },
      });
      expect(navigateResult.isError).toBe(false);

      const clickableElements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(clickableElements.isError).toBe(false);

      const elementsText = clickableElements.content?.[0]?.text || '';
      expect(elementsText).toContain('Download');

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 0,
        },
      });
      expect(clickResult.isError).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const downloadList = await client.callTool({
        name: 'browser_get_download_list',
        arguments: {},
      });
      expect(downloadList.isError).toBe(false);

      expect(downloadList.structuredContent).toEqual({
        list: expect.arrayContaining([
          expect.objectContaining({
            suggestedFilename: 'test.txt',
          }),
        ]),
      });

      const resourceResult = await client.readResource({
        uri: 'download://test.txt',
      });
      expect(resourceResult.contents).toHaveLength(1);

      const resourceContent = resourceResult.contents[0];
      expect(resourceContent).toBeTruthy();

      if ('text' in resourceContent) {
        expect(resourceContent.text).toBe('Hello world!');
      } else {
        throw new Error('Expected text content in resource');
      }

      const downloadedFile = path.join(testOutputDir, 'test.txt');
      expect(fs.existsSync(downloadedFile)).toBe(true);

      const fileContent = fs.readFileSync(downloadedFile, 'utf-8');
      expect(fileContent).toBe('Hello world!');
    },
  );

  test(
    'should download binary file and read content via resource',
    {
      timeout: 30000,
    },
    async () => {
      // 1x1 transparent png
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHF7eFyEwAAAABJRU5ErkJggg==';

      const htmlContent = `<a href="data:image/png;base64,${pngBase64}" download="test.png">Download PNG</a>`;
      const dataUrl = `data:text/html,${encodeURIComponent(htmlContent)}`;

      const navigateResult = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: dataUrl,
        },
      });
      expect(navigateResult.isError).toBe(false);

      const clickableElements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(clickableElements.isError).toBe(false);

      const elementsText = clickableElements.content?.[0]?.text || '';
      expect(elementsText).toContain('Download PNG');

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 0,
        },
      });
      expect(clickResult.isError).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const downloadList = await client.callTool({
        name: 'browser_get_download_list',
        arguments: {},
      });

      expect(downloadList.structuredContent).toEqual({
        list: expect.arrayContaining([
          expect.objectContaining({
            suggestedFilename: 'test.png',
          }),
        ]),
      });

      const resourceResult = await client.readResource({
        uri: 'download://test.png',
      });
      expect(resourceResult.contents).toHaveLength(1);

      const resourceContent = resourceResult.contents[0];
      expect(resourceContent).toBeTruthy();

      if ('blob' in resourceContent) {
        expect(resourceContent.blob).toBe(pngBase64);
        expect(resourceContent.mimeType).toBe('image/png');
      } else {
        throw new Error('Expected blob content in binary resource');
      }

      const downloadedFile = path.join(testOutputDir, 'test.png');
      expect(fs.existsSync(downloadedFile)).toBe(true);

      const fileBuffer = fs.readFileSync(downloadedFile);
      const fileBase64 = fileBuffer.toString('base64');
      expect(fileBase64).toBe(pngBase64);
    },
  );
});
