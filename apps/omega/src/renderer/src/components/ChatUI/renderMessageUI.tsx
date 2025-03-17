import { MarkdownRenderer } from '@vendor/chat-ui';
import { MessageItem, MessageType } from '@renderer/type/chatMessage';
import { AgentFlowMessage } from '../AgentFlowMessage';
import { MessageRole } from '@vendor/chat-ui';

export function renderMessageUI({ message }: { message: MessageItem }) {
  switch (message.type) {
    case MessageType.PlainText:
      return (
        <MarkdownRenderer
          content={message.content as string}
          smooth={!message.isFinal && message.role === MessageRole.Assistant}
        />
      );
    case MessageType.OmegaAgent:
      return <AgentFlowMessage message={message} />;
    default:
      return null;
  }
}
