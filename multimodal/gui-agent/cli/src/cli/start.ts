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
  output?: string;
  tasks?: string;
}

export const start = async (options: CliOptions) => {
  const CONFIG_PATH = options.config || path.join(os.homedir(), '.gui-agent-cli.json');

  // read config file
  let config = {
    baseURL: '',
    apiKey: '', // secretlint-disable-line
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

    config.apiKey = preset?.vlmApiKey; // secretlint-disable-line
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
        apiKey: () => p.text({ message: 'please input vlm model apiKey:' }), // secretlint-disable-line
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

  // Diagnostic: print model config loaded
  try {
    const maskedKey = config.apiKey
      ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}`
      : '(empty)';
    console.log('[CLI] Loaded model config:');
    console.log(`  provider: ${config.provider}`);
    console.log(`  baseURL: ${config.baseURL}`);
    console.log(`  model: ${config.model}`);
    console.log(`  apiKey: ${maskedKey}`); // secretlint-disable-line
    console.log(`  useResponsesApi: ${Boolean((config as any).useResponsesApi)}`);
  } catch (e) {
    console.warn('[CLI] Failed to print model config diagnostics:', e);
  }

  // Basic baseURL validation and hints for OpenAI-compatible servers
  try {
    if (config.baseURL) {
      let parsed: URL | null = null;
      try {
        parsed = new URL(config.baseURL);
      } catch (_) {
        console.warn('[CLI] Warning: baseURL is not a valid URL:', config.baseURL);
      }
      if (parsed) {
        const endsWithV1 = /\/v1\/?$/.test(parsed.pathname);
        if (!endsWithV1) {
          console.warn(
            '[CLI] Hint: OpenAI-compatible endpoints typically end with "/v1" (e.g. https://host/v1).',
          );
        }
        if (parsed.protocol !== 'https:') {
          console.warn('[CLI] Hint: use HTTPS for most providers. Current:', parsed.protocol);
        }
      }
    }
  } catch (e) {
    console.warn('[CLI] baseURL validation failed:', e);
  }

  // Preflight: check Chat Completions non-streaming response shape for OpenAI-compatible servers
  try {
    if (config.provider === 'openai' && config.baseURL && config.model) {
      const url = new URL(config.baseURL.replace(/\/$/, ''));
      url.pathname = url.pathname.replace(/\/$/, '') + '/chat/completions';
      console.log('[CLI] Preflight: POST', url.toString());
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 16000);
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
        }),
        signal: controller.signal,
      } as any);
      clearTimeout(timeout);
      const text = await resp.text();
      if (!resp.ok) {
        console.warn('[CLI] Preflight failed:', resp.status, resp.statusText);
        console.warn('[CLI] Preflight response body:', text.slice(0, 500));
      } else {
        try {
          const json = JSON.parse(text);
          const hasChoices = Array.isArray(json?.choices) && json.choices.length > 0;
          console.log('[CLI] Preflight ok. choices[0] exists:', hasChoices);
          if (!hasChoices) {
            console.warn(
              '[CLI] Preflight: response does not contain choices[]. Service may not implement Chat Completions.',
            );
          }
        } catch (_) {
          console.warn('[CLI] Preflight ok but response is not JSON:', text.slice(0, 200));
        }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      console.warn('[CLI] Preflight check timed out (16s). Proceeding without preflight.');
    } else {
      console.warn('[CLI] Preflight check error:', e);
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

  const useTasksFile = Boolean(options.tasks);
  const answers = useTasksFile
    ? { instruction: '' }
    : options.query
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

  const systemPrompts = [
    'You are provided with a task description, a history of previous actions, and corresponding screenshots. Your goal is to perform the next action to complete the task. Please note that if performing the same action multiple times results in a static screen with no changes, you should attempt a modified or alternative action.',
    '## Function Definition\n\n- You have access to the following functions:\n{"type": "function", "name": "call_user", "parameters": {"type": "object", "properties": {"content": {"type": "string", "description": "Message or information displayed to the user to request their input, feedback, or guidance."}}, "required": []}, "description": "This function is used to interact with the user by displaying a message and requesting their input, feedback, or guidance."}\n{"type": "function", "name": "click", "parameters": {"type": "object", "properties": {"point": {"type": "string", "description": "Click coordinates. The format is: <point>x y</point>"}}, "required": ["point"]}, "description": "Mouse left single click action."}\n{"type": "function", "name": "drag", "parameters": {"type": "object", "properties": {"start_point": {"type": "string", "description": "Drag start point. The format is: <point>x y</point>"}, "end_point": {"type": "string", "description": "Drag end point. The format is: <point>x y</point>"}}, "required": ["start_point", "end_point"]}, "description": "Mouse left button drag action."}\n{"type": "function", "name": "finished", "parameters": {"type": "object", "properties": {"content": {"type": "string", "description": "Provide the final answer or response to complete the task."}}, "required": []}, "description": "This function is used to indicate the completion of a task by providing the final answer or response."}\n{"type": "function", "name": "hotkey", "parameters": {"type": "object", "properties": {"key": {"type": "string", "description": "Hotkeys you want to press. Split keys with a space and use lowercase."}}, "required": ["key"]}, "description": "Press hotkey."}\n{"type": "function", "function": {"name": "infeasible", "parameters": {"type": "object", "properties": {"content": {"type": "string", "description": "Message or information displayed to the user to explain why the current task is infeasible."}}, "required": ["content"]}, "description": "This function is used to indicate that the current task is infeasible thus agent ends the task."}\n{"type": "function", "name": "left_double", "parameters": {"type": "object", "properties": {"point": {"type": "string", "description": "Click coordinates. The format is: <point>x y</point>"}}, "required": ["point"]}, "description": "Mouse left double click action."}\n{"type": "function", "name": "right_single", "parameters": {"type": "object", "properties": {"point": {"type": "string", "description": "Click coordinates. The format is: <point>x y</point>"}}, "required": ["point"]}, "description": "Mouse right single click action."}\n{"type": "function", "name": "scroll", "parameters": {"type": "object", "properties": {"point": {"type": "string", "description": "Scroll start position. If not specified, default to execute on the current mouse position. The format is: <point>x y</point>"}, "direction": {"type": "string", "description": "Scroll direction.", "enum": ["up", "down", "left", "right"]}}, "required": ["direction", "point"]}, "description": "Scroll action."}\n{"type": "function", "name": "type", "parameters": {"type": "object", "properties": {"content": {"type": "string", "description": "Type content. If you want to submit your input, use \\n at the end of content."}}, "required": ["content"]}, "description": "Type content."}\n{"type": "function", "name": "wait", "parameters": {"type": "object", "properties": {"time": {"type": "integer", "description": "Wait time in seconds."}}, "required": []}, "description": "Wait for a while."}\n\n- To call a function, use the following structure without any suffix:\n\n<think_never_used_51bce0c785ca2f68081bfa7d91973934> reasoning process </think_never_used_51bce0c785ca2f68081bfa7d91973934>\n<seed:tool_call_never_used_51bce0c785ca2f68081bfa7d91973934><function_never_used_51bce0c785ca2f68081bfa7d91973934=example_function_name><parameter_never_used_51bce0c785ca2f68081bfa7d91973934=example_parameter_1>value_1</parameter_never_used_51bce0c785ca2f68081bfa7d91973934><parameter_never_used_51bce0c785ca2f68081bfa7d91973934=example_parameter_2>\nThis is the value for the second parameter\nthat can span\nmultiple lines\n</parameter_never_used_51bce0c785ca2f68081bfa7d91973934></function_never_used_51bce0c785ca2f68081bfa7d91973934></seed:tool_call_never_used_51bce0c785ca2f68081bfa7d91973934>\n\n## Important Notes\n- Function calls must begin with <function_never_used_51bce0c785ca2f68081bfa7d91973934= and end with </function_never_used_51bce0c785ca2f68081bfa7d91973934>.\n- All required parameters must be explicitly provided.\n\n## Additional Notes\n- You can execute multiple actions within a single tool call. For example:\n<seed:tool_call_never_used_51bce0c785ca2f68081bfa7d91973934><function_never_used_51bce0c785ca2f68081bfa7d91973934=example_function_1><parameter_never_used_51bce0c785ca2f68081bfa7d91973934=example_parameter_1>value_1</parameter_never_used_51bce0c785ca2f68081bfa7d91973934><parameter_never_used_51bce0c785ca2f68081bfa7d91973934=example_parameter_2>\nThis is the value for the second parameter\nthat can span\nmultiple lines\n</parameter_never_used_51bce0c785ca2f68081bfa7d91973934></function_never_used_51bce0c785ca2f68081bfa7d91973934><function_never_used_51bce0c785ca2f68081bfa7d91973934=example_function_2><parameter_never_used_51bce0c785ca2f68081bfa7d91973934=example_parameter_3>value_4</parameter_never_used_51bce0c785ca2f68081bfa7d91973934></function_never_used_51bce0c785ca2f68081bfa7d91973934></seed:tool_call_never_used_51bce0c785ca2f68081bfa7d91973934>\n- 当你判断任务请求是无法执行的时候，你应该调用Infeasible工具结束任务并解释原因。\n            判断标准：当一个请求符合以下任何一条标准时，应被归类为“无法执行”。\n            1. 技术/物理层面的矛盾： 指令本身包含逻辑上或物理上无法实现的要求。\n            2. 工具/功能错配： 指令要求在一个软件中执行另一个软件的功能，或者执行该软件根本不具备的功能。\n            3. 超出操作边界/范围： 指令要求执行的操作超出了当前用户会话、权限或应用程序的逻辑边界，涉及未告知的隐私信息或者未授权的操作。\n            4. 依赖隐性知识或外部条件： 任务的完成依赖于Agent无法获取的外部硬件、物理环境、未声明的插件/扩展、或特定的文件/数据。\n\n            输出指令：\n            如果请求被判断为“无法执行”，你应该向用户解释为什么这个任务超出了你的能力范围（例如，指出它需要直接操作某个硬件），并尽可能提供一个指导性的替代方案，让用户可以自己完成该任务。\n            你应该非常非常谨慎地使用Infeasible工具，因为它会直接结束任务并降低用户体验。所以非必要的时候，你不应该调用Infeasible工具，尽量以finish工具结束任务并向用户提示原因就好。',
  ];

  const guiAgent = new GUIAgent({
    model: {
      id: config.model,
      provider: config.provider as any, // Type assertion to avoid TypeScript error
      baseURL: config.baseURL,
      apiKey: config.apiKey, // secretlint-disable-line
    },
    operator: targetOperator,
    systemPrompt: systemPrompts.join('\n\n'),
  });

  if (useTasksFile) {
    const demoDir = path.resolve(path.join(__dirname, '..', '..', 'demo'));
    const tasksPath =
      options.tasks === 'demo' ? path.join(demoDir, 'tasks.json') : path.resolve(options.tasks!);
    try {
      const dirOfTasks = path.dirname(tasksPath);
      fs.mkdirSync(dirOfTasks, { recursive: true });
      if (!fs.existsSync(tasksPath)) {
        const sample = [
          { taskId: 'task-1', query: 'Open Chrome and go to github.com' },
          { taskId: 'task-2', query: "Search for 'GUI Agent automation' on Google" },
        ];
        fs.writeFileSync(tasksPath, JSON.stringify(sample, null, 2));
        console.log(`[CLI] Sample tasks.json created: ${tasksPath}`);
      }
    } catch (e) {
      console.warn('[CLI] Failed to prepare tasks file directory', e);
    }

    let tasks: Array<{ taskId: string; query: string }> = [];
    try {
      const raw = fs.readFileSync(tasksPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) tasks = parsed;
      else console.warn('[CLI] tasks file is not an array');
    } catch (e) {
      console.error('[CLI] Failed to read tasks file', e);
      process.exit(1);
    }

    const targetOutputDir = options.output
      ? path.resolve(options.output)
      : options.tasks === 'demo'
        ? path.join(demoDir, 'results')
        : path.join(os.homedir(), '.gui-agent-results');
    console.log(`[CLI] Output directory (resolved): ${targetOutputDir}`);
    fs.mkdirSync(targetOutputDir, { recursive: true });

    for (const task of tasks) {
      try {
        const resultEvent = await guiAgent.run(task.query);
        const eventStream = guiAgent.getEventStream();
        const allEvents = eventStream.getEvents();
        const runStartEvents = allEvents.filter((e: any) => e.type === 'agent_run_start');
        const lastRunStart = runStartEvents[runStartEvents.length - 1] as any;
        const startIndex = allEvents.findIndex((e: any) => e.id === lastRunStart?.id);
        const endIndex = allEvents.findIndex(
          (e: any, idx: number) => idx > startIndex && e.type === 'agent_run_end',
        );
        const rangeEvents =
          startIndex >= 0
            ? endIndex >= 0
              ? allEvents.slice(startIndex, endIndex + 1)
              : allEvents.slice(startIndex)
            : allEvents;
        const envEvents = rangeEvents.filter((e: any) => e.type === 'environment_input');
        const screenshotEvents = envEvents.filter(
          (e: any) => e.metadata && e.metadata.type === 'screenshot',
        );
        const lastScreenshot =
          screenshotEvents.length > 0
            ? (screenshotEvents[screenshotEvents.length - 1] as any)
            : null;

        let resultPicPath = '';
        if (lastScreenshot && Array.isArray(lastScreenshot.content)) {
          const imgPart = (lastScreenshot.content as any[]).find(
            (c: any) => c.type === 'image_url' && c.image_url && c.image_url.url,
          );
          const dataUri: string | undefined = imgPart?.image_url?.url;
          if (dataUri && typeof dataUri === 'string' && dataUri.startsWith('data:')) {
            const commaIndex = dataUri.indexOf(',');
            const base64Data = commaIndex >= 0 ? dataUri.substring(commaIndex + 1) : dataUri;
            const buffer = Buffer.from(base64Data, 'base64');
            resultPicPath = path.join(targetOutputDir, `${task.taskId}.png`);
            fs.writeFileSync(resultPicPath, buffer);
            console.log(`[CLI] Screenshot saved: ${resultPicPath}`);
          }
        }
        if (!resultPicPath) {
          console.log('[CLI] No screenshot captured; resultPic will be empty.');
        }

        const finalAnswer = (resultEvent as any)?.content ?? '';
        const report = {
          taskId: task.taskId,
          resultPic: resultPicPath,
          finalAnswer,
        };
        const reportPath = path.join(targetOutputDir, `${task.taskId}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`Result saved: ${reportPath}`);
        console.log(`[CLI] Report JSON path: ${reportPath}`);
      } catch (taskErr) {
        console.error(`[CLI] Task failed: ${task.taskId}`, taskErr);
      }
    }
    return;
  }

  // Enhanced error logging around agent run
  let resultEvent: any;
  try {
    console.log(
      '[CLI] Starting GUIAgent run with instruction:',
      answers.instruction || options.query,
    );
    resultEvent = await guiAgent.run(answers.instruction);
    console.log('[CLI] GUIAgent run completed.');
  } catch (err: any) {
    console.error('[CLI] GUIAgent run failed.');
    const errMsg = err?.message || String(err);
    console.error('[CLI] Error message:', errMsg);
    if (err?.status) console.error('[CLI] HTTP status:', err.status);
    if (err?.code) console.error('[CLI] Error code:', err.code);
    const respData = err?.response?.data || err?.response?.body || err?.data;
    if (respData) {
      try {
        const text = typeof respData === 'string' ? respData : JSON.stringify(respData);
        console.error('[CLI] Response body:', text.slice(0, 500));
      } catch (_) {
        console.error('[CLI] Response body: [unprintable]');
      }
    }
    throw err;
  }

  try {
    const eventStream = guiAgent.getEventStream();
    const allEvents = eventStream.getEvents();
    const runStartEvents = allEvents.filter((e: any) => e.type === 'agent_run_start');
    const sessionId =
      runStartEvents.length > 0
        ? (runStartEvents[runStartEvents.length - 1] as any).sessionId
        : `${Date.now()}`;

    const envEvents = allEvents.filter((e: any) => e.type === 'environment_input');
    const screenshotEvents = envEvents.filter(
      (e: any) => e.metadata && e.metadata.type === 'screenshot',
    );
    const lastScreenshot =
      screenshotEvents.length > 0 ? (screenshotEvents[screenshotEvents.length - 1] as any) : null;

    const targetOutputDir = options.output
      ? path.resolve(options.output)
      : path.join(os.homedir(), '.gui-agent-results');
    console.log(`[CLI] Output directory (resolved): ${targetOutputDir}`);
    fs.mkdirSync(targetOutputDir, { recursive: true });
    console.log(`[CLI] TaskId/SessionId: ${sessionId}`);

    let resultPicPath = '';
    if (lastScreenshot && Array.isArray(lastScreenshot.content)) {
      const imgPart = (lastScreenshot.content as any[]).find(
        (c: any) => c.type === 'image_url' && c.image_url && c.image_url.url,
      );
      const dataUri: string | undefined = imgPart?.image_url?.url;
      if (dataUri && typeof dataUri === 'string' && dataUri.startsWith('data:')) {
        const commaIndex = dataUri.indexOf(',');
        const base64Data = commaIndex >= 0 ? dataUri.substring(commaIndex + 1) : dataUri;
        const buffer = Buffer.from(base64Data, 'base64');
        resultPicPath = path.join(targetOutputDir, `${sessionId}.png`);
        fs.writeFileSync(resultPicPath, buffer);
        console.log(`[CLI] Screenshot saved: ${resultPicPath}`);
      }
    }
    if (!resultPicPath) {
      console.log('[CLI] No screenshot captured; resultPic will be empty.');
    }

    const finalAnswer = (resultEvent as any)?.content ?? '';
    const report = {
      taskId: sessionId,
      resultPic: resultPicPath,
      finalAnswer,
    };
    const reportPath = path.join(targetOutputDir, `${sessionId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Result saved: ${reportPath}`);
    console.log(`[CLI] Report JSON path: ${reportPath}`);
  } catch (err) {
    console.warn('Failed to generate result report:', err);
  }
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
