import { MarkdownRenderer } from '@vendor/chat-ui';
import { EventItem } from '@renderer/type/event';

export function AgentStatus({ event }: { event: EventItem }) {
  return (
    <div className="flex items-center">
      <div className="text-sm">
        <MarkdownRenderer content={event.content as string} />
      </div>
    </div>
  );
}
