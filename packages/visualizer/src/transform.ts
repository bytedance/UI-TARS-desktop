/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import type { GroupedActionDump } from '@midscene/core';

interface ExecutionDumpWithPlaywrightAttributes extends GroupedActionDump {
  attributes: Record<string, any>;
}

const addBase64ImagePrefix = (base64: string) => {
  if (!base64) return '';

  return base64.startsWith('data:')
    ? base64
    : `data:image/png;base64,${base64}`;
};

export function transformComputerUseDataToDump(
  data: any,
): ExecutionDumpWithPlaywrightAttributes {
  return {
    groupName: data.instruction,
    groupDescription: '',
    executions: [
      {
        sdkVersion: data.version,
        model_name: data.modelName,
        logTime: data.logTime,
        name: data.instruction,
        tasks: data.conversations
          .map((conv: any) => {
            if (conv.from === 'human' && conv.value === '<image>') {
              return {
                status: 'finished',
                type: 'screenshot',
                timing: conv.timing,
                pageContext: {
                  screenshotBase64: addBase64ImagePrefix(
                    conv.screenshotBase64 || '',
                  ),
                  screenshotBase64WithElementMarker: addBase64ImagePrefix(
                    conv.screenshotBase64WithElementMarker || '',
                  ),
                  size: conv.screenshotContext?.size || { width: 0, height: 0 },
                },
                recorder: [
                  {
                    type: 'screenshot',
                    ts: conv.timing.start,
                    screenshot: addBase64ImagePrefix(
                      conv.screenshotBase64 || '',
                    ),
                    timing: 'before screenshot',
                  },
                ],
              };
            }

            if (conv.from === 'gpt') {
              return {
                status: 'finished',
                type: 'Action',
                timing: conv.timing,
                recorder: [
                  ...(conv.screenshotBase64
                    ? [
                        {
                          type: 'screenshot',
                          ts: conv.timing.start,
                          screenshot: addBase64ImagePrefix(
                            conv.screenshotBase64 || '',
                          ),
                          timing: 'before screenshot',
                        },
                      ]
                    : []),
                  ...(conv.screenshotBase64WithElementMarker
                    ? [
                        {
                          type: 'screenshot',
                          ts: conv.timing.start,
                          screenshot: addBase64ImagePrefix(
                            conv.screenshotBase64WithElementMarker || '',
                          ),
                          timing: 'after screenshot',
                        },
                      ]
                    : []),
                ],
              };
            }

            return null;
          })
          .filter(
            (task: any): task is NonNullable<typeof task> => task !== null,
          ),
      },
    ],
    attributes: {},
  };
}
