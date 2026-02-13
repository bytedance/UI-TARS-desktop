/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolFirstTarget = 'cursor' | 'settings' | 'notepad';

const TARGET_ALIAS_MATCHERS: Array<{
  target: ToolFirstTarget;
  aliases: string[];
}> = [
  { target: 'cursor', aliases: ['cursor'] },
  { target: 'settings', aliases: ['setting', 'settings'] },
  { target: 'notepad', aliases: ['notepad', 'textedit'] },
];

const TOOL_FIRST_TARGET_SUPPORT: Record<
  string,
  Partial<Record<ToolFirstTarget, readonly NodeJS.Platform[]>>
> = {
  'app.launch': {
    cursor: ['win32', 'darwin'],
    settings: ['win32', 'darwin', 'linux'],
    notepad: ['win32', 'darwin', 'linux'],
  },
  app_launch: {
    cursor: ['win32', 'darwin'],
    settings: ['win32', 'darwin', 'linux'],
    notepad: ['win32', 'darwin', 'linux'],
  },
  'window.focus': {
    cursor: ['win32', 'darwin'],
    settings: ['win32', 'darwin'],
    notepad: ['win32', 'darwin'],
  },
  window_focus: {
    cursor: ['win32', 'darwin'],
    settings: ['win32', 'darwin'],
    notepad: ['win32', 'darwin'],
  },
  'window.wait_ready': {
    cursor: ['win32', 'darwin', 'linux'],
    settings: ['win32', 'darwin', 'linux'],
    notepad: ['win32', 'darwin', 'linux'],
  },
  window_wait_ready: {
    cursor: ['win32', 'darwin', 'linux'],
    settings: ['win32', 'darwin', 'linux'],
    notepad: ['win32', 'darwin', 'linux'],
  },
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const resolveToolFirstTarget = (
  args: Record<string, unknown> | null | undefined,
): ToolFirstTarget | null => {
  const inputs = args || {};
  const candidates = [
    inputs.target_window,
    inputs.targetWindow,
    inputs.target_app,
    inputs.targetApp,
    inputs.target,
    inputs.window,
    inputs.app,
    inputs.name,
    inputs.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const value = normalize(candidate);
    if (!value) {
      continue;
    }

    for (const matcher of TARGET_ALIAS_MATCHERS) {
      if (matcher.aliases.some((alias) => value.includes(alias))) {
        return matcher.target;
      }
    }
  }

  return null;
};

export const isToolOnlyActionTargetSupported = (params: {
  actionType: string;
  target: ToolFirstTarget;
  platform: NodeJS.Platform;
}): boolean => {
  const actionType = normalize(params.actionType);
  const actionSupport = TOOL_FIRST_TARGET_SUPPORT[actionType];
  if (!actionSupport) {
    return false;
  }

  const targetSupport = actionSupport[params.target];
  if (!targetSupport) {
    return false;
  }

  return targetSupport.includes(params.platform);
};
