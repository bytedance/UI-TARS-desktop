/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import fetch from 'node-fetch';
import { GUIAgent, type GUIAgentData } from '@ui-tars/sdk';
import type { Operator as GUIOperator } from '@ui-tars/sdk/core';
import * as p from '@clack/prompts';
import yaml from 'js-yaml';

import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { getAndroidDeviceId, AdbOperator } from '@ui-tars/operator-adb';
import {
  autoLearnAndRun,
  buildAppMapContextPrompt,
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  buildOnPageHistoryMessages,
  extractNavigationSubtask,
  extractTargetPageName,
  loadMap,
  shouldUseAppMapContext,
} from '../auto-learn';

interface PresetConfig {
  vlmApiKey?: string;
  vlmBaseUrl?: string;
  vlmModelName?: string;
  useResponsesApi?: boolean;
}

type HistoryMessage = {
  from: 'gpt' | 'human';
  value: string;
};

export interface CliOptions {
  presets?: string;
  target?: string;
  query?: string;
  autoLearn?: boolean;
  forceRelearn?: boolean;
  appMapMode?: 'off' | 'navigation' | 'two-phase';
  package?: string;
}

function resolveAppMapMode(
  mode: CliOptions['appMapMode'],
): NonNullable<CliOptions['appMapMode']> {
  return mode || 'two-phase';
}

async function runAgentInstruction(params: {
  config: { baseURL: string; apiKey: string; model: string; useResponsesApi: boolean };
  operator: GUIOperator;
  signal: AbortSignal;
  instruction: string;
  systemPromptSuffix?: string;
  historyMessages?: HistoryMessage[];
}) {
  const guiAgent = new GUIAgent({
    model: {
      baseURL: params.config.baseURL,
      apiKey: params.config.apiKey,
      model: params.config.model,
      useResponsesApi: params.config.useResponsesApi,
    },
    operator: params.operator,
    systemPromptSuffix: params.systemPromptSuffix,
    signal: params.signal,
    onError: ({ data, error }: { data: GUIAgentData; error: Error }) => {
      console.error(error, data);
    },
  });

  await guiAgent.run(params.instruction, params.historyMessages);
}

export const start = async (options: CliOptions) => {
  const CONFIG_PATH = path.join(os.homedir(), '.ui-tars-cli.json');

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
    const preset = yaml.load(yamlText) as PresetConfig;

    config.apiKey = preset?.vlmApiKey ?? '';
    config.baseURL = preset?.vlmBaseUrl ?? '';
    config.model = preset?.vlmModelName ?? '';
    config.useResponsesApi = preset?.useResponsesApi ?? false;
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

  let targetOperator = null;
  const appMapMode = resolveAppMapMode(options.appMapMode);
  let navigationInstruction: string | undefined;
  let followUpInstruction: string | undefined;
  let targetPageName: string | undefined;
  let systemPromptSuffix: string | undefined;
  let followUpPromptSuffix: string | undefined;

  // Auto-learn phase (only for ADB target)
  if (options.target === 'adb' && options.package && appMapMode !== 'off') {
    let map = null;

    if (options.autoLearn) {
      if (!options.package) {
        console.error('--package is required when using --auto-learn with --target adb');
        process.exit(1);
      }

      const deviceId = await getAndroidDeviceId();
      if (deviceId == null) {
        console.error('No Android devices found. Please connect a device and try again.');
        process.exit(0);
      }

      map = await autoLearnAndRun({
        pkg: options.package,
        deviceId,
        modelConfig: config,
        forceRelearn: options.forceRelearn,
      });

      if (map) {
        console.log(
          `\n[Auto-Learn] App map ready: ${map.meta.package} (${Object.keys(map.pages).length} pages, ${map.navigation.tabs.length} tabs)`,
        );
      }
    } else {
      map = loadMap(options.package);
      if (map) {
        console.log(
          `\n[Auto-Learn] Using cached app map: ${map.meta.package} (${Object.keys(map.pages).length} pages, ${map.navigation.tabs.length} tabs)`,
        );
      }
    }

    if (map && options.query) {
      const navigationSubtask =
        appMapMode === 'two-phase'
          ? extractNavigationSubtask(options.query, map)
          : null;

      if (navigationSubtask) {
        navigationInstruction = navigationSubtask.navigationQuery;
        followUpInstruction = navigationSubtask.remainingQuery;
        targetPageName =
          extractTargetPageName(navigationInstruction, map) || 'target page';
        systemPromptSuffix = buildNavigationGoalPrompt(map, targetPageName);
        followUpPromptSuffix = buildOnPageActionPrompt(
          targetPageName,
          followUpInstruction,
        );
      } else if (shouldUseAppMapContext(options.query, map)) {
        targetPageName =
          extractTargetPageName(options.query, map) || 'target page';
        systemPromptSuffix = buildNavigationGoalPrompt(map, targetPageName);
      }
    }
  } else if (options.autoLearn && options.target === 'adb') {
    if (!options.package) {
      console.error('--package is required when using --auto-learn with --target adb');
      process.exit(1);
    }
  }

  const targetType =
    options.target ||
    ((await p.select({
      message: 'Please select your operator target:',
      options: [
        { value: 'nut-js', label: 'nut-js' },
        { value: 'adb', label: 'adb' },
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
    // case 'browser':
    //   // TODO: implement browser operator
    //   break;
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

  if (navigationInstruction && followUpInstruction) {
    await runAgentInstruction({
      config,
      operator: targetOperator,
      signal: abortController.signal,
      instruction: navigationInstruction,
      systemPromptSuffix,
    });
    await runAgentInstruction({
      config,
      operator: targetOperator,
      signal: abortController.signal,
      instruction: followUpInstruction,
      systemPromptSuffix: followUpPromptSuffix,
      historyMessages: buildOnPageHistoryMessages(targetPageName || 'target page'),
    });
    return;
  }

  await runAgentInstruction({
    config,
    operator: targetOperator,
    signal: abortController.signal,
    instruction: answers.instruction,
    systemPromptSuffix,
  });
};
