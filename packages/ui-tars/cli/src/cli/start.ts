/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import fetch from 'node-fetch';
import { GUIAgent, type GUIAgentData } from '@ui-tars/sdk';
import { StatusEnum, type ExecuteOutput, type Operator as GUIOperator } from '@ui-tars/sdk/core';
import * as p from '@clack/prompts';
import yaml from 'js-yaml';

import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { getAndroidDeviceId, AdbOperator } from '@ui-tars/operator-adb';
import {
  autoLearnAndRun,
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  buildOnPageHistoryMessages,
  buildRuntimeMapView,
  buildRuntimeMapViewPrompt,
  loadUIMap,
  parseRuntimeIntent,
  RUNTIME_BUDGETS,
  resolveRuntimeLocale,
} from '../auto-learn';
import type { CompletionPolicy } from '../auto-learn';

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
  runtimeLocale?: string;
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
  completionPolicy?: CompletionPolicy;
}) {
  const operator = createCompletionAwareOperator(
    params.operator,
    params.completionPolicy,
  );
  const guiAgent = new GUIAgent({
    model: {
      baseURL: params.config.baseURL,
      apiKey: params.config.apiKey,
      model: params.config.model,
      useResponsesApi: params.config.useResponsesApi,
    },
    operator,
    systemPromptSuffix: params.systemPromptSuffix,
    signal: params.signal,
    onError: ({ data, error }: { data: GUIAgentData; error: Error }) => {
      console.error(error, data);
    },
  });

  await guiAgent.run(params.instruction, params.historyMessages);
}

function createCompletionAwareOperator(
  baseOperator: GUIOperator,
  completionPolicy?: CompletionPolicy,
): GUIOperator {
  if (!completionPolicy) {
    return baseOperator;
  }

  return {
    constructor: baseOperator.constructor,
    screenshot: (...args) => baseOperator.screenshot(...args as []),
    execute: async (params) => {
      const result = (await baseOperator.execute(params)) as ExecuteOutput | void;
      const actionType = params.parsedPrediction.action_type;

      if (
        completionPolicy === 'stop_on_target_open' &&
        actionType === 'click' &&
        result?.status !== StatusEnum.ERROR &&
        result?.status !== StatusEnum.CALL_USER
      ) {
        return { ...(result || {}), status: StatusEnum.END };
      }

      if (
        completionPolicy === 'stop_after_content_action' &&
        actionType === 'type' &&
        result?.status !== StatusEnum.ERROR &&
        result?.status !== StatusEnum.CALL_USER
      ) {
        return { ...(result || {}), status: StatusEnum.END };
      }

      return result;
    },
  } as GUIOperator;
}

export const start = async (options: CliOptions) => {
  const CONFIG_PATH = path.join(os.homedir(), '.ui-tars-cli.json');
  const runtimeLocale = resolveRuntimeLocale(options.runtimeLocale);

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
  let followUpCompletionPolicy: CompletionPolicy | undefined;
  let targetPageName: string | undefined;
  let systemPromptSuffix: string | undefined;
  let followUpPromptSuffix: string | undefined;

  // Auto-learn phase (only for ADB target)
  if (options.target === 'adb' && options.package && appMapMode !== 'off') {
    let uiMap = null;
    let runtimeView = null;

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

      uiMap = await autoLearnAndRun({
        pkg: options.package,
        deviceId,
        modelConfig: config,
        forceRelearn: options.forceRelearn,
      });

      if (uiMap) {
        console.log(
          `\n[Auto-Learn] UI map ready: ${uiMap.meta.appId} (${Object.keys(uiMap.pages).length} pages, ${Object.keys(uiMap.elements).length} elements)`,
        );
      }
    } else {
      uiMap = loadUIMap(options.package);
      if (uiMap) {
        console.log(
          `\n[Auto-Learn] Using cached UI map: ${uiMap.meta.appId} (${Object.keys(uiMap.pages).length} pages, ${Object.keys(uiMap.elements).length} elements)`,
        );
      }
    }

    if (uiMap && options.query) {
      runtimeView = buildRuntimeMapView(uiMap, RUNTIME_BUDGETS.small, {
        query: options.query,
      });
      const runtimePrompt = buildRuntimeMapViewPrompt(runtimeView);
      systemPromptSuffix = systemPromptSuffix
        ? `${systemPromptSuffix}\n\n${runtimePrompt}`
        : runtimePrompt;
    }

    if (options.query) {
      const runtimeIntent = runtimeView
        ? parseRuntimeIntent(options.query, runtimeView, runtimeLocale)
        : null;

      if (appMapMode === 'two-phase' && runtimeIntent?.kind === 'navigate_then_act') {
        navigationInstruction = runtimeIntent.navigationQuery;
        followUpInstruction = runtimeIntent.remainingQuery;
        followUpCompletionPolicy = runtimeIntent.completionPolicy;
        targetPageName = runtimeIntent.targetPage.label || 'target page';
        const navigationPrompt = buildNavigationGoalPrompt(targetPageName);
        systemPromptSuffix = systemPromptSuffix
          ? `${navigationPrompt}\n\n${systemPromptSuffix}`
          : navigationPrompt;
        followUpPromptSuffix = buildOnPageActionPrompt(
          targetPageName,
          followUpInstruction,
          runtimeIntent.completionPolicy,
        );
        if (uiMap) {
          const followUpRuntimeView = buildRuntimeMapView(uiMap, RUNTIME_BUDGETS.small, {
            query: followUpInstruction,
            currentPageId: runtimeIntent.targetPage.id,
            targetPageId: runtimeIntent.targetPage.id,
            targetElementText: runtimeIntent.targetElements[0]?.label,
            preferredRoles:
              runtimeIntent.completionPolicy === 'stop_after_content_action'
                ? ['input', 'action', 'confirm']
                : ['action', 'content', 'navigation'],
          });
          followUpPromptSuffix = `${followUpPromptSuffix}\n\n${buildRuntimeMapViewPrompt(followUpRuntimeView)}`;
        }
      } else if (runtimeIntent?.kind === 'navigate') {
        targetPageName = runtimeIntent.targetPage.label || 'target page';
        const navigationPrompt = buildNavigationGoalPrompt(targetPageName);
        systemPromptSuffix = systemPromptSuffix
          ? `${navigationPrompt}\n\n${systemPromptSuffix}`
          : navigationPrompt;
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
      completionPolicy: followUpCompletionPolicy,
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
