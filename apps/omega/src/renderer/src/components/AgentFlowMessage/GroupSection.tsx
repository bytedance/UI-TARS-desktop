import { UIGroup, UIGroupType } from '@renderer/utils/parseEvents';
import { StepSection } from './StepSection';
import { ChatText } from './events/ChatText';
import { PlanTask } from '@renderer/type/agent';
import { LoadingStatus } from './events/LoadingStatus';
import { AgentFlowEnd } from './events/End';
import { EventType } from '@renderer/type/event';

interface GroupSectionProps {
  group: UIGroup;
  planTasks: PlanTask[];
  stepIndex?: number;
  groups: UIGroup[];
}

export function GroupSection({
  group,
  planTasks,
  stepIndex,
  groups,
}: GroupSectionProps) {
  if (group.type === UIGroupType.ChatText) {
    return <ChatText event={group.events[0]} />;
  }

  if (group.type === UIGroupType.Loading) {
    return <LoadingStatus title={'Thinking'} />;
  }

  if (group.type === UIGroupType.End) {
    return <AgentFlowEnd event={group.events[0]} />;
  }

  if (group.type === UIGroupType.PlanStep && stepIndex) {
    const previousGroups = groups.slice(0, groups.indexOf(group));

    const lastPlanStepGroup = [...previousGroups]
      .reverse()
      .find((g) => g.type === UIGroupType.PlanStep);

    const isContinuation = lastPlanStepGroup?.step === stepIndex;
    const isEnded = groups.find((g) => g.type === UIGroupType.End);
    const events = groups.flatMap((g) => g.events);
    const currentStep =
      events.find((e) => e.type === EventType.NewPlanStep) || 0;

    return (
      <StepSection
        step={stepIndex}
        events={group.events}
        isCurrentStep={
          Boolean(currentStep && !isEnded) && currentStep === stepIndex
        }
        planTasks={planTasks}
        isContinuation={isContinuation}
      />
    );
  }

  return null;
}
