/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// Load environment variables from .env.local file
import { config } from 'dotenv';
import path from 'node:path';
config({ path: path.join(__dirname, '..', '.env.local') });

import fs from 'node:fs';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { GUIAgent } from '../src/GUIAgent';
import { AgentModel } from '@tarko/agent-interface';
import { Operator } from '@gui-agent/shared/base';
import { SYSTEM_PROMPT } from '../src/prompts';

import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { AdbOperator } from '@gui-agent/operator-adb';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { doubao_1_5_vp } from './configs/models';
import { systemPromptTemplate1 } from './configs/promptTemps';

const defaultLogger = new ConsoleLogger('[GUIAgent Test CLI]', LogLevel.DEBUG);

interface TestOptions {
  target?: string;
}

interface ConfigData {
  operator: Operator;
  model: AgentModel;
  systemPrompt: string;
  snapshot?: {
    enable: boolean;
    storageDirectory: string;
  };
  uiTarsVersion?: string;
  webui?: {
    logo?: string;
    title?: string;
    subtitle?: string;
    welcomTitle?: string;
    welcomePrompts?: string[];
  };
}

// Config loading functionality
async function loadConfig(configName: string): Promise<ConfigData> {
  const configsDir = path.join(__dirname, 'configs');
  const configPath = path.join(configsDir, `${configName}.config.ts`);

  if (!fs.existsSync(configPath)) {
    const availableConfigs = listAvailableConfigs();
    throw new Error(
      `Config file not found: ${configPath}\nAvailable configs: ${availableConfigs.join(', ')}`,
    );
  }

  try {
    // Dynamic import of the config file
    const configModule = await import(configPath);
    const config = configModule.default;
    defaultLogger.debug(`loaded config: ${JSON.stringify(config)}`);

    if (!config || typeof config !== 'object') {
      throw new Error(
        `Invalid config format in ${configPath}. Config must export a default object.`,
      );
    }

    // Validate required fields
    if (!config.operator) {
      throw new Error(
        `Invalid or missing operator in config ${configName}. Must be a valid operator instance.`,
      );
    }

    if (!config.model || !config.model.provider || !config.model.id) {
      throw new Error(
        `Invalid or missing model configuration in config ${configName}. Model must have provider and id.`,
      );
    }

    if (!config.systemPrompt) {
      throw new Error(`Missing systemPrompt in config ${configName}`);
    }

    defaultLogger.debug(`✅ Successfully loaded config: ${configName}`);
    // defaultLogger.debug(`   - Operator Type: ${config.operatorType}`);
    defaultLogger.debug(`   - Model Provider: ${config.model.provider}`);
    defaultLogger.debug(`   - Model ID: ${config.model.id}`);

    return config as ConfigData;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid or missing')) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(`Failed to load config ${configName}: ${error}`);
  }
}

// List available config files
function listAvailableConfigs(): string[] {
  // __dirname is the directory of the current module: test-runner.ts
  const configsDir = path.join(__dirname, 'configs');
  if (!fs.existsSync(configsDir)) {
    return [];
  }
  return fs
    .readdirSync(configsDir)
    .filter((file) => file.endsWith('.config.ts'))
    .map((file) => file.replace('.config.ts', ''));
}

// Run with operator using config
async function runWithTarkoConfig(configName: string) {
  defaultLogger.debug(`🚀 Running with tarko command...`);

  // Map operator type to config file based on the loaded config
  const configsDir = path.resolve(__dirname, 'configs');
  const configFileName = `${configName}.config.ts`;
  const configPath = path.resolve(configsDir, configFileName);

  defaultLogger.debug(`📋 Using config file: ${configPath}`);

  // Execute tarko command
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const tarkoProcess = spawn(
      'tarko',
      ['--agent', path.resolve(__dirname, '..'), '--config', configPath],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(__dirname, '..'),
      },
    );

    let output = '';
    let errorOutput = '';

    tarkoProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      defaultLogger.debug(chunk);
    });

    tarkoProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      defaultLogger.error(chunk);
    });

    tarkoProcess.stdin.end();

    tarkoProcess.on('close', (code) => {
      if (code === 0) {
        defaultLogger.debug(`✅ gui agent with config ${configName} completed successfully`);
        resolve(output);
      } else {
        defaultLogger.error(`❌ gui agent with config ${configName} failed with exit code ${code}`);
        reject(new Error(`Tarko process exited with code ${code}`));
      }
    });

    tarkoProcess.on('error', (error) => {
      defaultLogger.error(`❌ Failed to start tarko process: ${error.message}`);
      reject(error);
    });
  });
}

async function runCli(options: { config?: string }) {
  // Load config if specified, otherwise prompt for selection
  let config: ConfigData;
  let configName: string;

  if (options.config) {
    try {
      config = await loadConfig(options.config);
    } catch (error) {
      defaultLogger.error(`❌ Failed to load config: ${error}`);
      process.exit(1);
    }
    configName = options.config;
  } else {
    // List available configs and let user choose
    const availableConfigs = listAvailableConfigs();
    if (availableConfigs.length === 0) {
      defaultLogger.error('❌ No config files found in configs directory');
      process.exit(1);
    }

    const selectedConfig = (await p.select({
      message: 'Please select a configuration:',
      options: availableConfigs.map((config) => ({ value: config, label: config })),
    })) as string;

    config = await loadConfig(selectedConfig);
    configName = selectedConfig;
  }
  defaultLogger.debug(`✅ Successfully loaded config: ${JSON.stringify(config, null, 2)}`);

  await runWithTarkoConfig(configName);
}

async function initializeOperator(operatorType: 'browser' | 'computer' | 'android') {
  let operator: Operator;
  if (operatorType === 'browser') {
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

async function testBrowserOperator() {
  console.log('🌐 Testing Browser Operator...');

  const operator = await initializeOperator('browser');
  const guiAgentForBrowser = new GUIAgent({
    operator,
    model: doubao_1_5_vp as AgentModel,
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

  const operator = await initializeOperator('computer');
  const guiAgentForComputer = new GUIAgent({
    operator,
    model: doubao_1_5_vp as AgentModel,
    systemPrompt: systemPromptTemplate1,
  });

  const computerResponse = await guiAgentForComputer.run({
    input: [{ type: 'text', text: 'Check the weather in Beijing' }],
  });

  console.log('\n📝 Agent with Computer Operator Response:');
  console.log('================================================');
  console.log(computerResponse.content);
  console.log('================================================');
}

async function testAndroidOperator() {
  console.log('📱 Testing Android Operator...');

  const operator = await initializeOperator('android');
  const guiAgentForAndroid = new GUIAgent({
    operator,
    model: doubao_1_5_vp as AgentModel,
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
  program.name('gui-agent').description('GUIAgent Test CLI').version('0.0.1');

  program
    .command('run')
    .description('Run GUIAgent with selected configuration')
    .option('-c, --config <config>', 'Configuration name (without .config.ts extension)')
    .action(async (options: { config?: string }) => {
      try {
        await runCli(options);
      } catch (err) {
        defaultLogger.error('Failed to run');
        defaultLogger.error(err);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List all available configuration files')
    .action(() => {
      const configs = listAvailableConfigs();
      if (configs.length === 0) {
        defaultLogger.debug('No configuration files found.');
      } else {
        defaultLogger.debug('Available configurations:');
        configs.forEach((config) => {
          defaultLogger.debug(`  - ${config}`);
        });
      }
    });

  program
    .command('test')
    .description('Test GUIAgent with different Operators')
    .option('-t, --target <target>', 'Target Operator (browser|computer|android|all)', 'all')
    .action(async (options: TestOptions) => {
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
          console.error(`❌ Unknown target type: ${target}`);
          console.error('Supported types: browser, computer, android, all');
          process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch(defaultLogger.error);
}
