/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import fetch from 'node-fetch';
import { GUIAgent } from '@gui-agent/agent-sdk';
import * as p from '@clack/prompts';
import yaml from 'js-yaml';

import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { AdbOperator } from '@gui-agent/operator-adb';
import { BrowserOperator } from '@gui-agent/operator-browser';

export interface CliOptions {
  presets?: string;
  target?: string;
  query?: string;
  config?: string;
}

export const start = async (options: CliOptions) => {
  const CONFIG_PATH = options.config || path.join(os.homedir(), '.gui-agent-cli.json');

  // read config file
  let config = {
    baseURL: '',
    apiKey: '',
    model: '',
    provider: 'openai', // Default provider
    useResponsesApi: false,
  };

  if (options.presets) {
    const response = await fetch(options.presets);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset: ${response.status}`);
    }

    const yamlText = await response.text();
    const preset = yaml.load(yamlText) as any;

    config.apiKey = preset?.vlmApiKey;
    config.baseURL = preset?.vlmBaseUrl;
    config.model = preset?.vlmModelName;
    config.useResponsesApi = preset?.useResponsesApi ?? false;
  } else if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (error) {
      console.warn('read config file failed', error);
    }
  }

  if (!config.baseURL || !config.apiKey || !config.model) {
    const configAnswers = await p.group(
      {
        provider: () =>
          p.select({
            message: 'Select model provider:',
            options: [
              { value: 'volcengine', label: 'VolcEngine' },
              { value: 'anthropic', label: 'Anthropic Claude' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'lm-studio', label: 'LM Studio' },
              { value: 'deepseek', label: 'DeepSeek' },
              { value: 'ollama', label: 'Ollama' },
            ],
          }),
        baseURL: () => p.text({ message: 'please input vlm model baseURL:' }),
        apiKey: () => p.text({ message: 'please input vlm model apiKey:' }),
        model: () => p.text({ message: 'please input vlm model name:' }),
      },
      {
        onCancel: () => {
          p.cancel('operation cancelled');
          process.exit(0);
        },
      },
    );

    config = { ...config, ...configAnswers };

    // save config to file
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('model config file saved to:', CONFIG_PATH);
    } catch (error) {
      console.error('save model config file failed', error);
    }
  }

  let targetOperator = null;
  const targetType =
    options.target ||
    ((await p.select({
      message: 'Please select your operator target:',
      options: [
        { value: 'computer', label: 'computer (Desktop automation)' },
        { value: 'android', label: 'android (Android automation)' },
        { value: 'browser', label: 'browser (Web automation)' },
      ],
    })) as string);

  switch (targetType) {
    case 'android':
      // Note: AdbOperator will auto-detect connected devices
      console.log('Initializing ADB operator...');
      targetOperator = new AdbOperator();
      break;
    case 'browser':
      // Use default browser options
      targetOperator = new BrowserOperator({
        browserType: 'chrome' as any,
        browser: null as any, // Will be initialized internally
      });
      break;
    case 'computer':
    default:
      targetOperator = new NutJSOperator();
      break;
  }

  const answers = options.query
    ? { instruction: options.query }
    : await p.group(
        {
          instruction: () => p.text({ message: 'Input your instruction' }),
        },
        {
          onCancel: () => {
            p.cancel('操作已取消');
            process.exit(0);
          },
        },
      );

  const abortController = new AbortController();
  process.on('SIGINT', () => {
    abortController.abort();
  });

  const guiAgent = new GUIAgent({
    model: {
      id: config.model,
      provider: config.provider as any, // Type assertion to avoid TypeScript error
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    },
    operator: targetOperator,
  });

  await guiAgent.run(answers.instruction);
};

export const resetConfig = async (configPath?: string) => {
  const CONFIG_PATH = configPath || path.join(os.homedir(), '.gui-agent-cli.json');

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
      console.log(`✓ Configuration file removed: ${CONFIG_PATH}`);
    } else {
      console.log(`No configuration file found at: ${CONFIG_PATH}`);
    }

    console.log(
      'Configuration has been reset. The next time you run gui-agent, you will be prompted to configure your settings again.',
    );
  } catch (error) {
    console.error('Failed to reset configuration:', error);
    process.exit(1);
  }
};
