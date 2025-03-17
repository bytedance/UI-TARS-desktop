import { MarkdownRenderer } from '@vendor/chat-ui';
import { EventItem } from '@renderer/type/event';

export function AgentFlowEnd({ event }: { event: EventItem }) {
  const defaultEndMessage =
    '> I have finished the tasks. Thank you for your time. Goodbye.';

  return (
    <MarkdownRenderer content={event.content?.message || defaultEndMessage} />
  );
}
