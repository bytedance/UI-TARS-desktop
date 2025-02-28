/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import fetch from 'node-fetch';
import { GUIAgent } from '@ui-tars/sdk';
import * as p from '@clack/prompts';
import yaml from 'js-yaml';

import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { getAndroidDeviceId, AdbOperator } from '@ui-tars/operator-adb';

export interface CliOptions {
  presets?: string;
  target?: string;
}
export const start = async (options: CliOptions) => {
  const CONFIG_PATH = path.join(os.homedir(), '.ui-tars-cli.json');

  // read config file
  let config = {
    baseURL: '',
    apiKey: '',
    model: '',
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
  } else if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (error) {
      console.warn('read config file failed', error);
      return;
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

  const answers = await p.group(
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

  let targetOperator = null;
  if (options.target === 'adb') {
    let deviceId = '';
    deviceId = await getAndroidDeviceId();
    targetOperator = new AdbOperator(deviceId);
  }

  targetOperator =
    targetOperator == null ? new NutJSOperator() : targetOperator;

  const guiAgent = new GUIAgent({
    model: {
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
    },
    operator: targetOperator,
    signal: abortController.signal,
    // onData: ({ data }) => {
    // console.log(
    //   '[======data======]',
    //   inspect(data, {
    //     showHidden: false,
    //     depth: null,
    //     colors: true,
    //     maxStringLength: 100,
    //   }),
    // );
    // },
    onError: ({ data, error }) => {
      console.error(error, data);
    },
  });

  await guiAgent.run(answers.instruction);
};
