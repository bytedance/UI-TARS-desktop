import { ToolCallType } from '@renderer/type/agent';
import {
  FiGlobe,
  FiCamera,
  FiMousePointer,
  FiType,
  FiList,
  FiCode,
  FiArrowDown,
  FiColumns,
} from 'react-icons/fi';

export function getIconForTool(tool: ToolCallType) {
  switch (tool) {
    case ToolCallType.BrowserNavigate:
      return <FiGlobe className="w-5 h-5" />;
    case ToolCallType.BrowserScreenshot:
      return <FiCamera className="w-5 h-5" />;
    case ToolCallType.BrowserClick:
    case ToolCallType.BrowserHover:
      return <FiMousePointer className="w-5 h-5" />;
    case ToolCallType.BrowserFormInputFill:
    case ToolCallType.BrowserSelect:
      return <FiType className="w-5 h-5" />;
    case ToolCallType.BrowserGetHtml:
    case ToolCallType.BrowserGetText:
    case ToolCallType.BrowserReadLinks:
      return <FiList className="w-5 h-5" />;
    case ToolCallType.BrowserEvaluate:
      return <FiCode className="w-5 h-5" />;
    case ToolCallType.BrowserScroll:
      return <FiArrowDown className="w-5 h-5" />; // 替换 FiScroll
    case ToolCallType.BrowserNewTab:
    case ToolCallType.BrowserCloseTab:
    case ToolCallType.BrowserSwitchTab:
      return <FiColumns className="w-5 h-5" />;
    default:
      return <FiGlobe className="w-5 h-5" />;
  }
}
