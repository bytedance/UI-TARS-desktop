import {
  ActionStatus,
  ToolCallParam,
  ToolCallType,
} from '@renderer/type/agent';

interface LoadingTipMeta {
  name: string;
  value: string;
  description: string;
}

export function getLoadingTipFromToolCall(
  tool: string,
  toolParams: string,
  status: ActionStatus,
): LoadingTipMeta {
  const toolName = tool as ToolCallType;
  const params = JSON.parse(toolParams || '{}');

  let value = '';
  let actionStatus = '';
  switch (status) {
    case ActionStatus.Running:
      actionStatus = 'Executing';
      break;
    case ActionStatus.Success:
      actionStatus = 'Executed';
      break;
    case ActionStatus.Failed:
      actionStatus = 'Failed';
      break;
  }

  switch (toolName) {
    case ToolCallType.ReadFile: {
      const typedParams = params as ToolCallParam[ToolCallType.ReadFile];
      value = typedParams.path;
      break;
    }
    case ToolCallType.WriteFile: {
      const typedParams = params as ToolCallParam[ToolCallType.WriteFile];
      value = typedParams.path;
      break;
    }
    case ToolCallType.GetFileInfo: {
      const typedParams = params as ToolCallParam[ToolCallType.GetFileInfo];
      value = typedParams.path;
      break;
    }
    case ToolCallType.ReadMultipleFiles: {
      const typedParams =
        params as ToolCallParam[ToolCallType.ReadMultipleFiles];
      value = `${typedParams.paths.length} files`;
      break;
    }
    case ToolCallType.EditFile: {
      const typedParams = params as ToolCallParam[ToolCallType.EditFile];
      value = `${typedParams.path} (${typedParams.edits.length} edits)`;
      break;
    }
    case ToolCallType.CreateDirectory: {
      const typedParams = params as ToolCallParam[ToolCallType.CreateDirectory];
      value = typedParams.path;
      break;
    }
    case ToolCallType.ListDirectory: {
      const typedParams = params as ToolCallParam[ToolCallType.ListDirectory];
      value = typedParams.path;
      break;
    }
    case ToolCallType.DirectoryTree: {
      const typedParams = params as ToolCallParam[ToolCallType.DirectoryTree];
      value = typedParams.path;
      break;
    }
    case ToolCallType.MoveFile: {
      const typedParams = params as ToolCallParam[ToolCallType.MoveFile];
      value = `${typedParams.source} → ${typedParams.destination}`;
      break;
    }
    case ToolCallType.SearchFiles: {
      const typedParams = params as ToolCallParam[ToolCallType.SearchFiles];
      value = `${typedParams.path} (pattern: ${typedParams.pattern})`;
      break;
    }
    case ToolCallType.RunCommand: {
      const typedParams = params as ToolCallParam[ToolCallType.RunCommand];
      value = typedParams.command;
      break;
    }
    case ToolCallType.RunScript: {
      const typedParams = params as ToolCallParam[ToolCallType.RunScript];
      value = `${typedParams.interpreter} script`;
      break;
    }
    case ToolCallType.WebSearch: {
      const typedParams = params as ToolCallParam[ToolCallType.WebSearch];
      value = typedParams.query;
      break;
    }
    case ToolCallType.BrowserNavigate: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserNavigate];
      value = typedParams.url;
      break;
    }
    case ToolCallType.BrowserScreenshot: {
      const typedParams =
        params as ToolCallParam[ToolCallType.BrowserScreenshot];
      value = `${typedParams.name}${typedParams.selector ? ` (${typedParams.selector})` : ''}`;
      break;
    }
    case ToolCallType.BrowserClick: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserClick];
      value = typedParams.selector;
      break;
    }
    case ToolCallType.BrowserFormInputFill: {
      const typedParams =
        params as ToolCallParam[ToolCallType.BrowserFormInputFill];
      value = `${typedParams.selector} → ${typedParams.value}`;
      break;
    }
    case ToolCallType.BrowserSelect: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserSelect];
      value = `${typedParams.selector} → ${typedParams.value}`;
      break;
    }
    case ToolCallType.BrowserHover: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserHover];
      value = typedParams.selector;
      break;
    }
    case ToolCallType.BrowserEvaluate: {
      value = 'executing script...';
      break;
    }
    case ToolCallType.BrowserGetHtml:
    case ToolCallType.BrowserGetText:
    case ToolCallType.BrowserReadLinks: {
      value = 'fetching...';
      break;
    }
    case ToolCallType.BrowserScroll: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserScroll];
      value = `${typedParams.amount}px`;
      break;
    }
    case ToolCallType.BrowserNewTab: {
      const typedParams = params as ToolCallParam[ToolCallType.BrowserNewTab];
      value = typedParams.url;
      break;
    }
    case ToolCallType.BrowserCloseTab: {
      value = 'closing current tab';
      break;
    }
    case ToolCallType.BrowserSwitchTab: {
      const typedParams =
        params as ToolCallParam[ToolCallType.BrowserSwitchTab];
      value = `tab ${typedParams.index}`;
      break;
    }
    default:
      switch (status) {
        case ActionStatus.Running:
          value = 'executing...';
          break;
        case ActionStatus.Success:
          value = 'done';
          break;
        case ActionStatus.Failed:
          value = 'failed';
          break;
      }
  }

  return {
    name: toolName,
    description: `${actionStatus} ${toolName?.replace(/_/g, ' ')}...`,
    value,
  };
}
