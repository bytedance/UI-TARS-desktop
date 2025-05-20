export { TextMessageRenderer } from './TextMessageRenderer';
export { StepsMessageRenderer } from './StepsMessageRenderer';
export { ToolCallMessageRenderer } from './ToolCallMessageRenderer';
export { ToolResultMessageRenderer } from './ToolResultMessageRenderer';

import { TextMessageRenderer } from './TextMessageRenderer';
import { StepsMessageRenderer } from './StepsMessageRenderer';
import { ToolCallMessageRenderer } from './ToolCallMessageRenderer';
import { ToolResultMessageRenderer } from './ToolResultMessageRenderer';
import type { MessageType, MessageRenderer } from '../types';

/**
 * 默认的消息渲染器映射表
 */
export const DEFAULT_MESSAGE_RENDERERS: Record<MessageType, MessageRenderer> = {
  text: TextMessageRenderer,
  steps: StepsMessageRenderer,
  tool_call: ToolCallMessageRenderer,
  tool_result: ToolResultMessageRenderer,
};
