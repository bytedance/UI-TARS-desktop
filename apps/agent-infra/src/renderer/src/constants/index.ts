import { ToolCallType } from '@renderer/type/agent';

export const STORAGE_DB_NAME = 'open-agent-chat';

export const SNAPSHOT_BROWSER_ACTIONS = [
  ToolCallType.BrowserHover,
  ToolCallType.BrowserNewTab,
  ToolCallType.BrowserNavigate,
  ToolCallType.BrowserSelect,
  ToolCallType.BrowserClick,
  ToolCallType.BrowserFormInputFill,
  ToolCallType.BrowserSwitchTab,
  ToolCallType.BrowserScroll,
];
export const isReportHtmlMode = Boolean(process.env.REPORT_HTML_MODE);
