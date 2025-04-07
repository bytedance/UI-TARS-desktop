import { ToolPlatform, toolToPlatformMap } from '@renderer/type/agent';
import { TerminalPanel } from './platform/TerminalPanel';
import { SearchPanel } from './platform/SearchPanel';
import { EventContentDescriptor, EventItem } from '@renderer/type/event';
import { SearchResult } from '@agent-infra/search';
import { BrowserPanel } from './platform/BrowserPanel';
import { FsPanel } from './platform/FsPanel';

export interface PanelDataForPlatform {
  [ToolPlatform.CommandLine]: {
    command: string;
    result: string;
  };
  [ToolPlatform.FileSystem]: {
    toolName: string;
    path: string;
    content: string;
    original?: string;
    edits?: Array<{
      oldText: string;
      newText: string;
    }>;
  };
  [ToolPlatform.Search]: {
    query: string;
    result: SearchResult;
  };
  [ToolPlatform.Browser]: {
    tool: string;
    params: any;
    result?: any;
  };
}

export function renderPlatformPanel({ event }: { event: EventItem }) {
  const data = event.content as EventContentDescriptor['tool-used'];
  const platform = toolToPlatformMap[data.tool];
  let platformData;

  switch (platform) {
    case ToolPlatform.CommandLine:
      platformData = {
        command: data.value,
        result: data.result,
      };
      break;
    case ToolPlatform.FileSystem:
      const toolCallParam = JSON.parse(data.params || '{}') || {};
      platformData = {
        toolName: data.tool,
        path: data.value,
        original: data.original,
        edits: toolCallParam.edits,
        content: toolCallParam.content || data.result?.[0].text,
      } as PanelDataForPlatform[ToolPlatform.FileSystem];
      break;
    case ToolPlatform.Search:
      platformData = {
        query: data.value,
        result: data.result,
      } as PanelDataForPlatform[ToolPlatform.Search];
      break;
    case ToolPlatform.Browser:
      platformData = {
        tool: data.tool,
        params: JSON.parse(data.params || '{}'),
        result: data.result,
      } as PanelDataForPlatform[ToolPlatform.Browser];
      break;
    default:
      return null;
  }

  switch (platform) {
    case ToolPlatform.FileSystem:
      return <FsPanel {...platformData} />;
    case ToolPlatform.CommandLine:
      return <TerminalPanel {...platformData} />;
    case ToolPlatform.Search:
      return <SearchPanel {...platformData} />;
    case ToolPlatform.Browser:
      return <BrowserPanel {...platformData} />;
    default:
      return null;
  }
}
