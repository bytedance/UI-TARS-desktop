/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SeedGUIAgent } from './SeedGUIAgent';
import { env } from 'process';
import { Command } from 'commander';
import { SYSTEM_PROMPT_LATEST } from './constants';

function validateEnvironmentVariables() {
  if (!env.SEED_BASE_URL || !env.SEED_MODEL || !env.SEED_API_KEY) {
    console.error('❌ 缺少必需的环境变量:');
    if (!env.SEED_BASE_URL) console.error('  - SEED_BASE_URL 未设置');
    if (!env.SEED_MODEL) console.error('  - SEED_MODEL 未设置');
    if (!env.SEED_API_KEY) console.error('  - SEED_API_KEY 未设置');
    console.error('请设置所有必需的环境变量后重试。');
    process.exit(1);
  }
}

function getModelConfig() {
  return {
    provider: 'openai-non-streaming',
    baseURL: env.SEED_BASE_URL!,
    id: env.SEED_MODEL!,
    apiKey: env.SEED_API_KEY!, // secretlint-disable-line
  } as const;
}

async function testBrowserOperator() {
  console.log('🌐 Testing Browser Operator...');

  const seedGUIAgentForBrowser = new SeedGUIAgent({
    operatorType: 'browser',
    model: getModelConfig(),
    uiTarsVersion: 'latest',
    systemPrompt: SYSTEM_PROMPT_LATEST,
  });

  const browserResponse = await seedGUIAgentForBrowser.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Browser Operator Response:');
  console.log('================================================');
  console.log(browserResponse.content);
  console.log('================================================');
}

async function testComputerOperator() {
  console.log('💻 Testing Computer Operator...');

  const seedGUIAgentForComputer = new SeedGUIAgent({
    operatorType: 'computer',
    model: getModelConfig(),
    uiTarsVersion: 'latest',
    systemPrompt: SYSTEM_PROMPT_LATEST,
  });

  const computerResponse = await seedGUIAgentForComputer.run({
    input: [{ type: 'text', text: 'What is Agent TARS' }],
  });

  console.log('\n📝 Agent with Computer Operator Response:');
  console.log('================================================');
  console.log(computerResponse.content);
  console.log('================================================');
}

async function testAndroidOperator() {
  console.log('📱 Testing Android Operator...');

  const seedGUIAgentForAndroid = new SeedGUIAgent({
    operatorType: 'android',
    model: getModelConfig(),
    uiTarsVersion: 'latest',
    // TODO: 这里的systemPrompt需要根据android的prompt来写
    systemPrompt: SYSTEM_PROMPT_LATEST,
  });

  const androidResponse = await seedGUIAgentForAndroid.run({
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
  validateEnvironmentVariables();

  const program = new Command();
  program
    .name('seed-gui-agent-test')
    .description('Test SeedGUIAgent with different operators')
    .version('1.0.0');

  program
    .option('-t, --target <target>', 'The target operator (browser|computer|android|all)', 'all')
    .action(async (options) => {
      const { target } = options;
      switch (target.toLowerCase()) {
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

export * from './SeedGUIAgent';
export { SeedGUIAgent as default } from './SeedGUIAgent';
