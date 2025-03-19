import {
  MessageContentType,
  MessageItem,
  MessageType,
} from '@renderer/type/chatMessage';

export function extractHistoryEvents(messages: MessageItem[]) {
  return messages
    .filter((message) => message.type === MessageType.OmegaAgent)
    .flatMap(
      (message) =>
        (message.content as MessageContentType['omega-agent']).events,
    );
}
