import { ToolCallType } from '@renderer/type/agent';
import { BrowserPanelProps } from './types';
import { ScreenshotContent } from './components/ScreenshotContent';
import { TextContent } from './components/TextContent';
import { LinksContent } from './components/LinksContent';
import { DefaultContent } from './components/DefaultContent';

export function BrowserPanel({ tool, params, result }: BrowserPanelProps) {
  const toolType = tool as ToolCallType;
  const contentProps = { tool: toolType, params, result };

  const renderContent = () => {
    switch (toolType) {
      case ToolCallType.BrowserScreenshot:
        return <ScreenshotContent {...contentProps} />;
      case ToolCallType.BrowserGetHtml:
      case ToolCallType.BrowserGetText:
        return <TextContent {...contentProps} />;
      case ToolCallType.BrowserReadLinks:
        return <LinksContent {...contentProps} />;
      default:
        return <DefaultContent {...contentProps} />;
    }
  };

  return <div className="h-full overflow-auto">{renderContent()}</div>;
}
