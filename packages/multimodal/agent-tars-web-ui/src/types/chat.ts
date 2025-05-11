export type Model = string;

export type AgentIntermediateState = {
  type: string;
  content: string;
  blocks?: AgentIntermediateBlock[];
  steps?: AgentStep[];
};

export type AgentIntermediateBlock = {
  id: string;
  type: string;
  title: string;
  content: string;
};

export type AgentStep = {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
};

// 扩展消息类型以支持步骤信息
export type MessageType = 'text' | 'steps';

// 扩展消息接口
export interface ExtendedMessage extends Omit<import('@multimodal/ui').Message, 'meta'> {
  type?: MessageType;
  steps?: AgentStep[];
  meta?: Record<string, unknown>;
}
