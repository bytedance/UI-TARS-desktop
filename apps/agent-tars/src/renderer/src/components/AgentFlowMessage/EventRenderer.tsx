import { EventItem, EventType } from '@renderer/type/event';
import { LoadingStatus } from './events/LoadingStatus';
import { ToolUsed } from './events/ToolUsed';
import { AgentStatus } from './events/AgentStatus';
import { ChatText } from './events/ChatText';
// import { Observation } from './events/Observation';
import { UserInterruption } from './events/UserInterruption';
import { AgentFlowEnd } from './events/End';

export function EventRenderer({
  event,
  isLastEvent,
}: {
  event: EventItem;
  isLastEvent: boolean;
}) {
  const components = {
    [EventType.LoadingStatus]: LoadingStatus,
    [EventType.ToolUsed]: ToolUsed,
    [EventType.AgentStatus]: AgentStatus,
    [EventType.ChatText]: ChatText,
    // [EventType.Observation]: Observation,
    [EventType.UserInterruption]: UserInterruption,
    [EventType.End]: AgentFlowEnd,
  };

  const Component = components[event.type];
  if (!Component) return null;

  return (
    <div className="relative ml-4 my-2">
      <Component event={event} isLastEvent={isLastEvent} />
    </div>
  );
}
