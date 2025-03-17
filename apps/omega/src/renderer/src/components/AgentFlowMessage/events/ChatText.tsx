import { MarkdownRenderer } from '@vendor/chat-ui';
import { EventItem } from '@renderer/type/event';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';

export function ChatText({ event }: { event: EventItem }) {
  return (
    <div className="px-4">
      <ErrorBoundary
        fallback={<div className="text-gray-400">{event.content}</div>}
      >
        <MarkdownRenderer content={event.content} />
      </ErrorBoundary>
    </div>
  );
}
