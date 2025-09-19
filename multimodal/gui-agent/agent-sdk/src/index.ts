/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { env } from 'process';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { SYSTEM_PROMPT_LATEST, SYSTEM_PROMPT } from './prompts';
import { GUIAgent } from './GUIAgent';
import { AgentModel } from '@tarko/agent-interface';
import { Operator } from '@gui-agent/shared/base';

import { LocalBrowser } from '@agent-infra/browser';
import { BrowserOperator } from '@gui-agent/operator-browser';
import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { AdbOperator } from '@gui-agent/operator-adb';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

const defaultLogger = new ConsoleLogger('[GUI Agent CLI]', LogLevel.DEBUG);

interface TestOptions {
  target?: string;
}

interface CliOptions {
  target?: string;
  query?: string;
}

interface ConfigFileData {
  baseURL?: string;
  model?: string;
  apiKey?: string;
}

function validateEnvironmentVariables() {
  // secretlint-disable-next-line
  if (!env.ARK_BASE_URL || !env.ARK_MODEL || !env.ARK_API_KEY) {
    console.error('❌ 缺少必需的环境变量:');
    if (!env.ARK_BASE_URL) console.error('  - ARK_BASE_URL 未设置');
    if (!env.ARK_MODEL) console.error('  - ARK_MODEL 未设置');
    if (!env.ARK_API_KEY) console.error('  - ARK_API_KEY 未设置'); // secretlint-disable-line
    console.error('请设置所有必需的环境变量后重试。');
    process.exit(1);
  }
}

function getModelConfig(): AgentModel {
  return {
    provider: 'openai-non-streaming',
    baseURL: env.ARK_BASE_URL!,
    id: env.ARK_MODEL!,
    apiKey: env.ARK_API_KEY!, // secretlint-disable-line
  };
}

async function getConfigFromFile(): Promise<ConfigFileData> {
  const CONFIG_PATH = path.join(os.homedir(), '.seed-gui-agent-cli.json');

  if (env.ARK_API_KEY && env.ARK_BASE_URL && env.ARK_MODEL) {
    return {
      baseURL: env.ARK_BASE_URL,
      model: env.ARK_MODEL,
      apiKey: env.ARK_API_KEY, // secretlint-disable-line
    };
  }

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return {
        baseURL: config.baseURL,
        model: config.model,
        apiKey: config.apiKey, // secretlint-disable-line
      };
    } catch (error) {
      console.warn('读取配置文件失败', error);
    }
  }

  return {};
}

async function initilizeOperator(operatorType: 'browser' | 'computer' | 'android') {
  let operator: Operator;
  if (operatorType === 'browser') {
    /*
    const browser = new LocalBrowser();
    const browserOperator = new BrowserOperator({
      browser,
      browserType: 'chrome',
      logger: defaultLogger,
      highlightClickableElements: false,
      showActionInfo: false,
    });

    await browser.launch();
    const openingPage = await browser.createPage();
    await openingPage.goto('https://www.google.com/', {
      waitUntil: 'networkidle2',
    });
    operator = browserOperator;
    */
    throw new Error('The Browser Operator refactor NOT ready.');
  } else if (operatorType === 'computer') {
    const computerOperator = new NutJSOperator();
    operator = computerOperator;
  } else if (operatorType === 'android') {
    const adbOperator = new AdbOperator();
    operator = adbOperator;
  } else {
    throw new Error(`Unknown operator type: ${operatorType}`);
  }
  return operator;
}

async function runWithOperator(
  operatorType: 'browser' | 'computer' | 'android',
  instruction: string,
  modelConfig: ConfigFileData,
) {
  console.log(`🚀 运行 ${operatorType} operator...`);

  const operator = await initilizeOperator(operatorType);
  const guiAgent = new GUIAgent({
    operator,
    model: {
      provider: 'openai-non-streaming',
      baseURL: modelConfig.baseURL,
      id: modelConfig.model!, // 注意这里是model而不是id
      apiKey: modelConfig.apiKey, // secretlint-disable-line
    },
    // uiTarsVersion: 'latest',
    systemPrompt: SYSTEM_PROMPT,
  });

  const response = await guiAgent.run({
    input: [{ type: 'text', text: instruction }],
  });

  console.log(`\n📝 ${operatorType} 场景响应:`);
  console.log('================================================');
  console.log(response.content);
  console.log('================================================');
}

async function startCli(options: CliOptions) {
  let modelConfig = await getConfigFromFile();

  if (!modelConfig.baseURL || !modelConfig.apiKey || !modelConfig.model) {
    console.log('🔧请输入模型配置信息:');
    const configAnswers = await p.group(
      {
        baseURL: () =>
          p.text({
            message: '请输入模型 baseURL:',
            defaultValue: modelConfig.baseURL || '',
          }),
        // secretlint-disable-next-line
        apiKey: () =>
          p.text({
            message: '请输入模型 apiKey:', // secretlint-disable-line
            defaultValue: modelConfig.apiKey || '', // secretlint-disable-line
          }),
        model: () =>
          p.text({
            message: '请输入模型名称:',
            defaultValue: modelConfig.model || '',
          }),
      },
      {
        onCancel: () => {
          p.cancel('操作已取消');
          process.exit(0);
        },
      },
    );

    modelConfig = { ...modelConfig, ...configAnswers };

    const CONFIG_PATH = path.join(os.homedir(), '.seed-gui-agent-cli.json');
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(modelConfig, null, 2));
      console.log('✅ 配置文件已保存到:', CONFIG_PATH);
    } catch (error) {
      console.error('❌ 保存配置文件失败', error);
    }
  } else {
    console.log('✅ 使用已有模型配置');
  }

  const targetType =
    options.target ||
    ((await p.select({
      message: '请选择operator类型:',
      options: [
        { value: 'browser', label: 'browser operator' },
        { value: 'computer', label: 'computer operator' },
        { value: 'android', label: 'android operator' },
      ],
    })) as string);

  const instruction = options.query || ((await p.text({ message: '请输入您的指令:' })) as string);

  if (!instruction) {
    console.error('❌ 未提供指令');
    process.exit(1);
  }

  await runWithOperator(targetType as 'browser' | 'computer' | 'android', instruction, modelConfig);
}

async function testBrowserOperator() {
  console.log('🌐 Testing Browser Operator...');

  const operator = await initilizeOperator('browser');
  const guiAgentForBrowser = new GUIAgent({
    operator,
    model: getModelConfig(),
    // uiTarsVersion: 'latest',
    systemPrompt: SYSTEM_PROMPT,
  });

  const browserResponse = await guiAgentForBrowser.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Browser Operator Response:');
  console.log('================================================');
  console.log(browserResponse.content);
  console.log('================================================');
}

async function testComputerOperator() {
  console.log('💻 Testing Computer Operator...');

  const operator = await initilizeOperator('computer');
  const guiAgentForComputer = new GUIAgent({
    operator,
    model: {
      provider: getModelConfig().provider,
      baseURL: getModelConfig().baseURL,
      id: getModelConfig().id,
      apiKey: getModelConfig().apiKey, // secretlint-disable-line
    },
    // uiTarsVersion: 'latest',
    systemPrompt: SYSTEM_PROMPT,
  });

  const computerResponse = await guiAgentForComputer.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Computer Operator Response:');
  console.log('================================================');
  console.log(computerResponse.content);
  console.log('================================================');
}

async function testAndroidOperator() {
  console.log('📱 Testing Android Operator...');

  const operator = await initilizeOperator('android');
  const guiAgentForAndroid = new GUIAgent({
    operator,
    model: getModelConfig(),
    // uiTarsVersion: 'latest',
    // TODO: 这里的systemPrompt需要根据android的prompt来写
    systemPrompt: SYSTEM_PROMPT,
  });

  const androidResponse = await guiAgentForAndroid.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Android Operator Response:');
  console.log('================================================');
  console.log(androidResponse.content);
  console.log('================================================');
}

async function testAllOperators() {
  console.log('🚀 Testing All Operators...');
  await testBrowserOperator();
  await testComputerOperator();
  await testAndroidOperator();
}

async function main() {
  const program = new Command();
  program.name('gui-agent').description('GUIAgent CLI').version('0.0.1');

  program
    .command('start')
    .description('启动 GUIAgent...')
    .option('-t, --target <target>', '目标operator (browser|computer|android)')
    .option('-q, --query <query>', '用户指令')
    .action(async (options: CliOptions) => {
      try {
        await startCli(options);
      } catch (err) {
        console.error('启动失败');
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command('test')
    .description('测试 GUIAgent 不同Operator')
    .option('-t, --target <target>', '目标Operator (browser|computer|android|all)', 'all')
    .action(async (options: TestOptions) => {
      validateEnvironmentVariables();
      const { target } = options;
      switch (target?.toLowerCase()) {
        case 'browser':
          await testBrowserOperator();
          break;
        case 'computer':
          await testComputerOperator();
          break;
        case 'android':
          await testAndroidOperator();
          break;
        case 'all':
          await testAllOperators();
          break;
        default:
          console.error(`❌ 未知的目标类型: ${target}`);
          console.error('支持的类型: browser, computer, android, all');
          process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch(console.error);
}

export * from './GUIAgent';
export { GUIAgent as default } from './GUIAgent';
