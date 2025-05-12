export { TextMessageRenderer } from './TextMessageRenderer';
export { StepsMessageRenderer } from './StepsMessageRenderer';

import { TextMessageRenderer } from './TextMessageRenderer';
import { StepsMessageRenderer } from './StepsMessageRenderer';
import type { MessageType, MessageRenderer } from '../types';

/**
 * 默认的消息渲染器映射表
 */
export const DEFAULT_MESSAGE_RENDERERS: Record<MessageType, MessageRenderer> = {
  text: TextMessageRenderer,
  steps: StepsMessageRenderer,
};
