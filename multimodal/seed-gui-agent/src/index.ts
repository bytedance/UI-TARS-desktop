/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { ComputerOperator } from './ComputerOperator';
import { getAndroidDeviceId, AdbOperator } from '@ui-tars/operator-adb';
import { seedBrowserGUIAgent } from './SeedBrowserGUIAgent';
import { SeedGUIAgent } from './SeedGUIAgent';
import { env } from 'process';

async function main() {
  const response = await seedBrowserGUIAgent.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent Response:');
  console.log('================================================');
  console.log(response.content);
  console.log('================================================');
}

async function testOperators() {
  if (!env.SEED_BASE_URL || !env.SEED_MODEL || !env.SEED_API_KEY) {
    console.error('❌ 缺少必需的环境变量:');
    if (!env.SEED_BASE_URL) console.error('  - SEED_BASE_URL 未设置');
    if (!env.SEED_MODEL) console.error('  - SEED_MODEL 未设置');
    if (!env.SEED_API_KEY) console.error('  - SEED_API_KEY 未设置');
    console.error('请设置所有必需的环境变量后重试。');
    process.exit(1);
  }

  const baseURL = env.SEED_BASE_URL;
  const id = env.SEED_MODEL;
  const apiKey = env.SEED_API_KEY;

  console.log('Operators testing...');
  const browser = new LocalBrowser();
  const browserOperator = new BrowserOperator({
    browser,
    browserType: 'chrome',
    logger: undefined,
    highlightClickableElements: false,
    showActionInfo: false,
  });
  await browser.launch();
  const openingPage = await browser.createPage();
  await openingPage.goto('https://www.google.com/', {
    waitUntil: 'networkidle2',
  });

  const seedGUIAgentForBrowser = new SeedGUIAgent({
    operator: browserOperator,
    model: {
      baseURL: baseURL,
      id: id,
      apiKey: apiKey,
      uiTarsVersion: 'doubao-1.5-ui-tars-20b',
    },
  });
  const browserResponse = await seedGUIAgentForBrowser.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Browser Operator Response:');
  console.log('================================================');
  console.log(browserResponse.content);
  console.log('================================================');

  const computerOperator = new ComputerOperator();
  const seedGUIAgentForComputer = new SeedGUIAgent({
    operator: computerOperator,
    model: {
      baseURL: baseURL,
      id: id,
      apiKey: apiKey,
      uiTarsVersion: 'doubao-1.5-ui-tars-20b',
    },
  });
  const computerResponse = await seedGUIAgentForComputer.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Computer Operator Response:');
  console.log('================================================');
  console.log(computerResponse.content);
  console.log('================================================');

  const deviceId = await getAndroidDeviceId();
  if (deviceId == null) {
    console.error('No Android devices found. Please connect a device and try again.');
    process.exit(0);
  }
  const adbOperator = new AdbOperator(deviceId);
  const seedGUIAgentForAndroid = new SeedGUIAgent({
    operator: adbOperator,
    model: {
      baseURL: baseURL,
      id: id,
      apiKey: apiKey,
      uiTarsVersion: 'doubao-1.5-ui-tars-20b',
    },
  });
  const androidResponse = await seedGUIAgentForAndroid.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });
  console.log('\n📝 Agent with Android Operator Response:');
  console.log('================================================');
  console.log(androidResponse.content);
  console.log('================================================');
}

if (require.main === module) {
  // main().catch(console.error);
  testOperators().catch(console.error);
}
