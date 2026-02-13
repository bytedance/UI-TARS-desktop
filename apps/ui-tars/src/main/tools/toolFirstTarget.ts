/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolFirstTarget = 'cursor' | 'settings' | 'notepad';
export type ToolFirstTargetResolution = {
  target: ToolFirstTarget;
  confidence: number;
  sourceField: string;
  ambiguous: boolean;
};

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

const TARGET_IDENTITY_FIELDS = new Set<string>([
  'target_window',
  'targetWindow',
  'target_app',
  'targetApp',
  'target',
  'window',
  'app',
  'name',
]);

export const resolveToolFirstTargetWithConfidence = (
  args: Record<string, unknown> | null | undefined,
): ToolFirstTargetResolution | null => {
  const inputs = args || {};
  const candidates = [
    { sourceField: 'target_window', value: inputs.target_window },
    { sourceField: 'targetWindow', value: inputs.targetWindow },
    { sourceField: 'target_app', value: inputs.target_app },
    { sourceField: 'targetApp', value: inputs.targetApp },
    { sourceField: 'target', value: inputs.target },
    { sourceField: 'window', value: inputs.window },
    { sourceField: 'app', value: inputs.app },
    { sourceField: 'name', value: inputs.name },
    { sourceField: 'content', value: inputs.content },
  ];

  for (const candidate of candidates) {
    if (typeof candidate.value !== 'string') {
      continue;
    }

    const normalizedValue = normalize(candidate.value);
    if (!normalizedValue) {
      continue;
    }

    const matches = TARGET_ALIAS_MATCHERS.flatMap((matcher) => {
      const matchedAlias =
        matcher.aliases.find((alias) => alias === normalizedValue) ||
        matcher.aliases.find((alias) => normalizedValue.includes(alias));
      if (!matchedAlias) {
        return [];
      }

      return [{ target: matcher.target, matchedAlias }];
    });

    if (matches.length === 0) {
      continue;
    }

    const primaryMatch = matches[0];
    const isExactMatch = primaryMatch.matchedAlias === normalizedValue;
    const explicitIdentityField = TARGET_IDENTITY_FIELDS.has(
      candidate.sourceField,
    );
    const ambiguous = matches.length > 1;

    let confidence = explicitIdentityField ? 0.78 : 0.62;
    if (isExactMatch) {
      confidence = explicitIdentityField ? 1 : 0.9;
    }
    if (ambiguous) {
      confidence = explicitIdentityField ? 0.45 : 0.3;
    }

    return {
      target: primaryMatch.target,
      confidence,
      sourceField: candidate.sourceField,
      ambiguous,
    };
  }

  return null;
};

export const resolveToolFirstTarget = (
  args: Record<string, unknown> | null | undefined,
): ToolFirstTarget | null => {
  return resolveToolFirstTargetWithConfidence(args)?.target ?? null;
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
