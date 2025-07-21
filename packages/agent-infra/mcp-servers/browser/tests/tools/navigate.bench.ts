/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import { AddressInfo } from 'net';
import { waitForPageAndFramesLoad } from '@agent-infra/browser-use';
import {
  afterAll,
  afterEach,
  beforeAll,
  bench,
  describe,
  expect,
} from 'vitest';

import { ensureBrowser } from '../../src/utils/browser.js';

let app: express.Express;
let httpServer: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(() => {
  app = express();

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Home Page</title></head>
        <body>
          <h1>Welcome to Home</h1>
          <img src="https://sf3-cdn-tos.douyinstatic.com/obj/eden-cn/uhbfnupkbps/216.png" />
          <form action="/submit" method="post">
            <input type="text" name="username" placeholder="Username" />
            <input type="password" name="password" placeholder="Password" />
            <button type="submit">Submit</button>
          </form>

          <script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/common/tt_pc_bricks.7ae7414d.js" crossorigin="anonymous"></script><script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/common/collect.9c3f3aed.js" crossorigin="anonymous"></script><script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/common/react.8b46fd1a.js" crossorigin="anonymous"></script><script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/common/runtime.432dd451.js" crossorigin="anonymous"></script><script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/common/vendor.7fb6799a.js" crossorigin="anonymous"></script><script nonce="zn_A6Xt5CByjvqrNsjORp" type="text/javascript" src="https://lf-dw.toutiaostatic.com/obj/toutiao-duanwai/toutiao/toutiao_web_pc/pages/newsIndex/index.0fd4ded7.js" crossorigin="anonymous"></script>
          <script>
            document.body.innerHTML = '<h1>Welcome to Home</h1>';
          </script>
        </body>
      </html>
    `);
  });

  httpServer = app.listen(0);
  const address = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${address.port}`;

  const { page } = await ensureBrowser();
  await page.goto(baseUrl);
});

afterAll(() => {
  httpServer?.close();
});

afterEach(async () => {
  const { page } = await ensureBrowser();
  await page.close();
});

describe('navigate performance', () => {
  bench('page.goto()', async () => {
    const { page } = await ensureBrowser();
    await page.goto(baseUrl);

    expect(page.url()).toBe(baseUrl + '/');
  });

  bench('page.goto() waitUntil networkidle2', async () => {
    const { page } = await ensureBrowser();
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench('page.goto() waitUntil networkidle0', async () => {
    const { page } = await ensureBrowser();
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench('page.goto() + waitForPageAndFramesLoad', async () => {
    const { page } = await ensureBrowser();
    await Promise.all([page.goto(baseUrl), waitForPageAndFramesLoad(page)]);
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench('page.goto() networkidle2 + waitForPageAndFramesLoad', async () => {
    const { page } = await ensureBrowser();
    await Promise.all([
      page.goto(baseUrl, { waitUntil: 'networkidle2' }),
      waitForPageAndFramesLoad(page),
    ]);
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench('page.goto() networkidle0 + waitForPageAndFramesLoad', async () => {
    const { page } = await ensureBrowser();
    await Promise.all([
      page.goto(baseUrl, { waitUntil: 'networkidle0' }),
      waitForPageAndFramesLoad(page),
    ]);
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench('page.goto() networkidle0 + waitForPageAndFramesLoad 0.5', async () => {
    const { page } = await ensureBrowser();
    await Promise.all([
      page.goto(baseUrl),
      waitForPageAndFramesLoad(page, 0.5),
    ]);
    expect(await page.content()).toContain('Welcome to Home');
  });

  bench(
    'page.goto() domcontentloaded  + waitForPageAndFramesLoad',
    async () => {
      const { page } = await ensureBrowser();
      await Promise.all([
        page.goto(baseUrl, { waitUntil: 'domcontentloaded' }),
        waitForPageAndFramesLoad(page),
      ]);
      expect(await page.content()).toContain('Welcome to Home');
    },
  );

  bench(
    'page.goto() domcontentloaded  + waitForPageAndFramesLoad 0.5',
    async () => {
      const { page } = await ensureBrowser();
      await Promise.all([
        page.goto(baseUrl, { waitUntil: 'domcontentloaded' }),
        waitForPageAndFramesLoad(page, 0.5),
      ]);
      expect(await page.content()).toContain('Welcome to Home');
    },
  );
});
