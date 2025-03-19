import { ToolCallType } from '@renderer/type/agent';

export interface BrowserPanelProps {
  tool: string;
  params: any;
  result?: any;
}

export interface ContentProps {
  tool: ToolCallType;
  params: any;
  result?: any;
}
