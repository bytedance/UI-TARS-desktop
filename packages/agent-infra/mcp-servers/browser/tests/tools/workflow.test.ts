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

describe('Browser Workflow Comprehensive Tests', () => {
  let client: Client;
  let app: express.Express;
  let httpServer: ReturnType<typeof app.listen>;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Workflow Test Home</title></head>
          <body>
            <h1>E-commerce Demo</h1>
            <form id="loginForm" action="/login" method="post">
              <input type="email" id="email" name="email" placeholder="Email" required />
              <input type="password" id="password" name="password" placeholder="Password" required />
              <button type="submit" id="loginBtn">Login</button>
            </form>
            <div id="products">
              <div class="product" data-id="1">
                <h3>Product 1</h3>
                <button class="add-to-cart" data-product="1">Add to Cart</button>
              </div>
              <div class="product" data-id="2">
                <h3>Product 2</h3>
                <button class="add-to-cart" data-product="2">Add to Cart</button>
              </div>
            </div>
            <div id="cart" style="display: none;">
              <h3>Shopping Cart</h3>
              <div id="cart-items"></div>
              <button id="checkout">Checkout</button>
            </div>
          </body>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              const addToCartButtons = document.querySelectorAll('.add-to-cart');
              const cart = document.getElementById('cart');
              const cartItems = document.getElementById('cart-items');

              addToCartButtons.forEach(button => {
                button.addEventListener('click', function() {
                  const productId = this.getAttribute('data-product');
                  const productName = this.parentElement.querySelector('h3').textContent;

                  const cartItem = document.createElement('div');
                  cartItem.textContent = productName;
                  cartItems.appendChild(cartItem);

                  cart.style.display = 'block';
                });
              });
            });
          </script>
        </html>
      `);
    });

    app.post('/login', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Dashboard</title></head>
          <body>
            <h1>Welcome to Dashboard</h1>
            <p>Login successful!</p>
            <a href="/profile">View Profile</a>
            <a href="/orders">View Orders</a>
          </body>
        </html>
      `);
    });

    app.get('/profile', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>User Profile</title></head>
          <body>
            <h1>User Profile</h1>
            <form id="profileForm">
              <input type="text" id="firstName" placeholder="First Name" value="John" />
              <input type="text" id="lastName" placeholder="Last Name" value="Doe" />
              <select id="country">
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
              </select>
              <button type="submit">Update Profile</button>
            </form>
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
  });

  afterEach(async () => {
    await client.callTool({
      name: 'browser_close',
    });
    await client.close();
  });

  describe('Complete User Workflows', () => {
    test('should complete login workflow', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#email',
          value: 'test@example.com',
        },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#password',
          value: 'password123',
        },
      });

      const submitResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          selector: '#loginBtn',
        },
      });
      expect(submitResult.isError).toBe(true);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect((content.content as any)[0].text).toContain('E-commerce Demo');
    });

    test('should complete shopping cart workflow', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const addToCartResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          selector: '.add-to-cart[data-product="1"]',
        },
      });
      expect(addToCartResult.isError).toBe(true);

      const cartVisible = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.getElementById("cart").style.display !== "none";',
        },
      });
      expect(cartVisible.isError).toBe(false);
    });

    test('should complete profile update workflow', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/profile` },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#firstName',
          value: 'Jane',
        },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#lastName',
          value: 'Smith',
        },
      });

      const selectResult = await client.callTool({
        name: 'browser_select',
        arguments: {
          selector: '#country',
          value: 'ca',
        },
      });
      expect(selectResult.isError).toBe(false);

      const firstNameValue = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.getElementById("firstName").value;',
        },
      });
      expect(firstNameValue.content?.[0].text).toContain('Jane');
    });
  });

  describe('Multi-Tab Workflows', () => {
    test('should handle workflow across multiple tabs', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/profile` },
      });

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/profile` },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#firstName',
          value: 'MultiTab',
        },
      });

      await client.callTool({
        name: 'browser_switch_tab',
        arguments: { index: 0 },
      });

      const homeContent = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(homeContent.content?.[0].text).toContain('E-commerce Demo');

      await client.callTool({
        name: 'browser_switch_tab',
        arguments: { index: 1 },
      });

      const profileValue = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.getElementById("firstName").value;',
        },
      });
      expect(profileValue.content?.[0].text).toContain('MultiTab');
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should handle form validation errors', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const submitWithoutData = await client.callTool({
        name: 'browser_click',
        arguments: {
          selector: '#loginBtn',
        },
      });
      expect(submitWithoutData.isError).toBe(true);

      const stillOnSamePage = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(stillOnSamePage.content?.[0].text).toContain('E-commerce Demo');
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle rapid successive operations', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      for (let i = 0; i < 5; i++) {
        const result = await client.callTool({
          name: 'browser_get_text',
          arguments: {},
        });
        expect(result.isError).toBe(false);
      }
    });

    test('should handle multiple form interactions', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/profile` },
      });

      const operations = [
        { selector: '#firstName', value: 'Test1' },
        { selector: '#lastName', value: 'Test2' },
        { selector: '#firstName', value: 'Test3' },
        { selector: '#lastName', value: 'Test4' },
      ];

      for (const op of operations) {
        const result = await client.callTool({
          name: 'browser_form_input_fill',
          arguments: op,
        });
        expect(result.isError).toBe(false);
      }

      const finalValue = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.getElementById("firstName").value;',
        },
      });
      expect(finalValue.content?.[0].text).toContain('Test3');
    });
  });
});
