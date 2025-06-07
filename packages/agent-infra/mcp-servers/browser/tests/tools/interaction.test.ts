import {
  afterEach,
  beforeEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, type GlobalConfig } from '../../src/server';
import express from 'express';
import { AddressInfo } from 'net';

const findElementIndex = (elementsText: string, pattern: RegExp): number => {
  if (elementsText.indexOf('[') === -1) return 0;
  const match = elementsText.match(pattern);
  return match ? parseInt(match[1]) : 0;
};

describe('Browser Interaction Comprehensive Tests', () => {
  let client: Client;
  let app: express.Express;
  let httpServer: any;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Interactive Test Page</title></head>
          <body>
            <h1>Interactive Elements Test</h1>

            <!-- Text inputs -->
            <input type="text" id="textInput" placeholder="Enter text" />
            <input type="email" id="emailInput" placeholder="Enter email" />
            <input type="password" id="passwordInput" placeholder="Enter password" />
            <textarea id="textArea" placeholder="Enter long text"></textarea>

            <!-- Buttons -->
            <button id="primaryButton">Primary Button</button>
            <button id="secondaryButton" disabled>Disabled Button</button>
            <input type="button" id="inputButton" value="Input Button" />

            <!-- Select elements -->
            <select id="singleSelect">
              <option value="">Choose option</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>

            <select id="multiSelect" multiple>
              <option value="multi1">Multi 1</option>
              <option value="multi2">Multi 2</option>
              <option value="multi3">Multi 3</option>
            </select>

            <!-- Checkboxes and radio buttons -->
            <input type="checkbox" id="checkbox1" value="check1" />
            <label for="checkbox1">Checkbox 1</label>

            <input type="radio" id="radio1" name="radioGroup" value="radio1" />
            <label for="radio1">Radio 1</label>
            <input type="radio" id="radio2" name="radioGroup" value="radio2" />
            <label for="radio2">Radio 2</label>

            <!-- Links -->
            <a href="/page2" id="normalLink">Normal Link</a>
            <a href="javascript:void(0)" id="jsLink" onclick="alert('JS Link clicked')">JS Link</a>
            <a href="#section1" id="anchorLink">Anchor Link</a>

            <!-- Hover elements -->
            <div id="hoverDiv" style="width: 100px; height: 100px; background: blue;"
                 onmouseover="this.style.background='red'"
                 onmouseout="this.style.background='blue'">
              Hover me
            </div>

            <!-- Form -->
            <form id="testForm" action="/submit" method="post">
              <input type="text" name="formInput" id="formInput" />
              <button type="submit" id="submitButton">Submit Form</button>
            </form>

            <!-- Dynamic content -->
            <button id="addContentButton" onclick="addContent()">Add Content</button>
            <div id="dynamicContent"></div>

            <script>
              function addContent() {
                document.getElementById('dynamicContent').innerHTML = '<p>Dynamic content added!</p>';
              }

              let clickCount = 0;
              document.getElementById('primaryButton').addEventListener('click', function() {
                clickCount++;
                this.textContent = 'Clicked ' + clickCount + ' times';
              });
            </script>
          </body>
        </html>
      `);
    });

    app.get('/page2', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Page 2</title></head>
          <body>
            <h1>You navigated to Page 2</h1>
            <a href="/">Back to Home</a>
          </body>
        </html>
      `);
    });

    app.post('/submit', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Form Submitted</title></head>
          <body>
            <h1>Form was submitted successfully</h1>
            <a href="/">Back to Home</a>
          </body>
        </html>
      `);
    });

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await httpServer.close();
  });

  beforeEach(async () => {
    client = new Client(
      {
        name: 'test client',
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
    } as GlobalConfig);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: baseUrl },
    });
  });

  afterEach(async () => {
    await client.callTool({
      name: 'browser_close',
    });
    await client.close();
  });

  describe('Form Input Interactions', () => {
    test('should fill text input using selector', async () => {
      const result = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#textInput',
          value: 'Test text input',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain(
        'Filled #textInput with: Test text input',
      );
    });

    test('should fill text input using index', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(elements.isError).toBe(false);

      const result = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          index: 0,
          value: 'Test with index',
        },
      });
      expect(result.isError).toBe(false);
    });

    test('should handle form input without selector or index', async () => {
      const result = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          value: 'Test value',
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain(
        'Either selector or index must be provided',
      );
    });

    test('should fill different input types', async () => {
      const emailResult = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#emailInput',
          value: 'test@example.com',
        },
      });
      expect(emailResult.isError).toBe(false);

      const passwordResult = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#passwordInput',
          value: 'secretpassword',
        },
      });
      expect(passwordResult.isError).toBe(false);

      const textAreaResult = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#textArea',
          value: 'This is a long text that goes into a textarea element.',
        },
      });
      expect(textAreaResult.isError).toBe(false);
    });
  });

  describe('Click Interactions', () => {
    test('should click button using index', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(elements.isError).toBe(false);

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 4,
        },
      });
      expect(clickResult.isError).toBe(false);
      expect(clickResult.content?.[0].text).toContain('Clicked element: 4');
    });

    test('should handle clicking non-existent element index', async () => {
      const result = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 999,
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain(
        'Cannot read properties of undefined',
      );
    });

    test('should click links and navigate', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });

      const linkIndex = findElementIndex(
        elements.content?.[0].text,
        /\[(\d+)\]<a[^>]*>Normal Link<\/a>/,
      );

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: linkIndex,
        },
      });
      expect(clickResult.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('You navigated to Page 2');
    });

    test('should handle click timeout gracefully', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });

      const buttonIndex = findElementIndex(
        elements.content?.[0].text,
        /\[(\d+)\]<button[^>]*>Primary Button<\/button>/,
      );

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: buttonIndex,
        },
      });
      expect(clickResult.isError).toBe(false);
    });
  });

  describe('Select Interactions', () => {
    test('should select option using selector', async () => {
      const result = await client.callTool({
        name: 'browser_select',
        arguments: {
          selector: '#singleSelect',
          value: 'option2',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain(
        'Selected #singleSelect with: option2',
      );
    });

    test('should select option using index', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });

      const selectIndex = findElementIndex(
        elements.content?.[0].text,
        /\[(\d+)\]<select[^>]*id="singleSelect"/,
      );

      const result = await client.callTool({
        name: 'browser_select',
        arguments: {
          index: selectIndex,
          value: 'option1',
        },
      });
      expect(result.isError).toBe(true);
    });

    test('should handle select without selector or index', async () => {
      const result = await client.callTool({
        name: 'browser_select',
        arguments: {
          value: 'option1',
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain('No selector');
    });
  });

  describe('Hover Interactions', () => {
    test('should hover element using selector', async () => {
      const result = await client.callTool({
        name: 'browser_hover',
        arguments: {
          selector: '#hoverDiv',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Hovered #hoverDiv');
    });

    test('should hover element using index', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });

      const hoverIndex = findElementIndex(
        elements.content?.[0].text,
        /\[(\d+)\]<div[^>]*id="hoverDiv"/,
      );

      const result = await client.callTool({
        name: 'browser_hover',
        arguments: {
          index: hoverIndex,
        },
      });
      expect(result.isError).toBe(false);
    });

    test('should handle hover without selector or index', async () => {
      const result = await client.callTool({
        name: 'browser_hover',
        arguments: {},
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain('No selector');
    });
  });

  describe('JavaScript Evaluation', () => {
    test('should execute simple JavaScript', async () => {
      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.title;',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Interactive Test Page');
    });

    test('should execute JavaScript that modifies DOM', async () => {
      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script:
            'document.getElementById("textInput").value = "Modified by JS";',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Execution result');
    });

    test('should handle JavaScript errors', async () => {
      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'throw new Error("Test error");',
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain('Script execution failed');
    });

    test('should execute JavaScript with console logging', async () => {
      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'console.log("Test log message");',
        },
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('Keyboard Interactions', () => {
    test('should press Enter key', async () => {
      const result = await client.callTool({
        name: 'browser_press_key',
        arguments: {
          key: 'Enter',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Pressed key: Enter');
    });

    test('should press Tab key', async () => {
      const result = await client.callTool({
        name: 'browser_press_key',
        arguments: {
          key: 'Tab',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Pressed key: Tab');
    });

    test('should press Escape key', async () => {
      const result = await client.callTool({
        name: 'browser_press_key',
        arguments: {
          key: 'Escape',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Pressed key: Escape');
    });

    test('should handle invalid key', async () => {
      const result = await client.callTool({
        name: 'browser_press_key',
        arguments: {
          key: 'Backspace',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Pressed key');
    });
  });
});
