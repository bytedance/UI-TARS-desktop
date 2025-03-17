import {
  ActionStatus,
  ToolPlatform,
  toolToPlatformMap,
} from '@renderer/type/agent';
import { getLoadingTipFromToolCall } from './getLoadingTipForToolCall';

export function normalizeToolUsedInfo(
  tool: string,
  params: string,
  status: ActionStatus,
  result: {
    [key: string]: any;
  },
) {
  const platform = toolToPlatformMap[tool] || ToolPlatform.System;
  const description = `Using ${platform} to execute ${tool.replace(/_/g, ' ')}`;
  const { value } = getLoadingTipFromToolCall(tool, params, status);
  return {
    tool,
    params,
    description,
    status,
    value,
    result,
  };
}
