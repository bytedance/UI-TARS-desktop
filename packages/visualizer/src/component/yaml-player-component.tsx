/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import type { MidsceneYamlFlowItemAIAction } from '@midscene/core';
import { type ScriptPlayer, flowItemBrief } from '@midscene/web/yaml';
import { Steps } from 'antd';
import { useState } from 'react';

export function YamlPlayerStatusIndicator({
  player,
}: {
  player: ScriptPlayer;
}) {
  const [loadingProgressText, setLoadingProgressText] = useState('');
  const [steps, setSteps] = useState<
    {
      title: string;
      description: string;
    }[]
  >([]);
  if (player) {
    player.onTaskStatusChange = (taskStatus) => {
      const currentTask = taskStatus;
      const newSteps: any[] = [];

      for (let i = 0; i < currentTask.totalSteps; i++) {
        const flow = currentTask.flow[i];
        const brief = flowItemBrief(flow);
        const tips = (
          (flow as MidsceneYamlFlowItemAIAction).aiActionProgressTips || []
        ).join('\n');
        newSteps.push({
          title: currentTask.name || '(unnamed)',
          description: <pre>{tips}</pre>,
        });
      }

      setSteps(newSteps);

      let overallStatus = '';
      if (taskStatus.status === 'init') {
        overallStatus = 'initializing...';
      } else if (
        taskStatus.status === 'running' ||
        taskStatus.status === 'error'
      ) {
        const item = taskStatus.flow[0] as MidsceneYamlFlowItemAIAction;
        // const brief = flowItemBrief(item);
        const tips = item?.aiActionProgressTips || [];
        if (tips.length > 0) {
          overallStatus = tips[tips.length - 1];
        }
      }

      setLoadingProgressText(overallStatus);
    };
  }

  return (
    <div>
      <Steps direction="vertical" size="small" current={1} items={steps} />
    </div>
  );
}
