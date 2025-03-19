import { MessageItem, OmegaAgentData } from '@renderer/type/chatMessage';
import { extractEventStreamUIMeta, UIGroupType } from '../../utils/parseEvents';
import { GroupSection } from './GroupSection';

export function AgentFlowMessage({ message }: { message: MessageItem }) {
  const flowDataEvents = (message.content as OmegaAgentData).events || [];
  const meta = extractEventStreamUIMeta(flowDataEvents);

  if (flowDataEvents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400 italic border border-dashed rounded-lg m-4 dark:border-gray-700">
        No events to display
      </div>
    );
  }

  return (
    <div className="agent-flow-message relative">
      <div className="space-y-4">
        {meta.eventGroups.map((group, index) => {
          const currentStepIndex =
            group.type === UIGroupType.PlanStep ? group.step : undefined;

          return (
            <GroupSection
              key={index}
              group={group}
              stepIndex={currentStepIndex}
              planTasks={meta.planTasks}
              groups={meta.eventGroups}
            />
          );
        })}
      </div>
    </div>
  );
}
