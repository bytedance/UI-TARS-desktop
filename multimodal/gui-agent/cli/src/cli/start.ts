/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import fetch from 'node-fetch';
import { GUIAgent } from '@gui-agent/agent-sdk';
import * as p from '@clack/prompts';
import yaml from 'js-yaml';

import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { getAndroidDeviceId, AdbOperator } from '@gui-agent/operator-adb';
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
        { value: 'nut-js', label: 'nut-js (Desktop automation)' },
        { value: 'adb', label: 'adb (Android automation)' },
        { value: 'browser', label: 'browser (Web automation)' },
      ],
    })) as string);

  switch (targetType) {
    case 'adb':
      const deviceId = await getAndroidDeviceId();
      if (deviceId == null) {
        console.error(
          'No Android devices found. Please connect a device and try again.',
        );
        process.exit(0);
      }
      targetOperator = new AdbOperator(deviceId);
      break;
    case 'browser':
      targetOperator = new BrowserOperator();
      break;
    case 'nut-js':
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
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
      useResponsesApi: config.useResponsesApi,
    },
    operator: targetOperator,
    signal: abortController.signal,
    onData: ({ data }) => {
      console.log('[Agent Data]', data);
    },
    onError: ({ data, error }) => {
      console.error('[Agent Error]', error, data);
    },
  });

  await guiAgent.run(answers.instruction);
};
