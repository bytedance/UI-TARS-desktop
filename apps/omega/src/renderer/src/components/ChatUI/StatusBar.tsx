import { Loader2 } from 'lucide-react';
import { ProgressBar } from '../AgentFlowMessage/ProgressBar';
import {
  EventStreamUIMeta,
  extractEventStreamUIMeta,
} from '@renderer/utils/parseEvents';
import { PlanTaskStatus } from '@renderer/type/agent';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { eventsAtom } from '@renderer/state/chat';

export function StatusBar() {
  const [uiMeta, setUIMeta] = useState<EventStreamUIMeta | null>(null);
  const events = useAtomValue(eventsAtom);
  useEffect(() => {
    if (events.length > 0) {
      const meta = extractEventStreamUIMeta(events);
      if (meta.planTasks.length > 0) {
        setUIMeta(meta);
      }
    }
  }, [events]);

  if (!uiMeta) {
    return null;
  }

  const { currentStepIndex, planTasks } = uiMeta;

  const lastFinishedTask = [...planTasks]
    .reverse()
    .find((task) => task.status === PlanTaskStatus.Done);

  const progress = (currentStepIndex / Math.max(planTasks.length, 1)) * 100;

  const isLoading = planTasks.some(
    (task) => task.status === PlanTaskStatus.Doing,
  );

  const getStatusText = () => {
    if (isLoading) {
      const currentTask = planTasks[currentStepIndex - 1];
      return currentTask?.title || 'Processing...';
    }
    return lastFinishedTask?.title;
  };

  return (
    <div className="sticky top-0 z-10">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md" />

      {/* Content */}
      <div className="relative border-b border-gray-200/50 dark:border-gray-700/50 p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isLoading && (
              <Loader2
                size={16}
                className="text-blue-500 dark:text-blue-400 animate-spin"
              />
            )}
            <span className="text-sm font-medium bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
              {getStatusText()}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            Step {currentStepIndex} of {planTasks.length}
          </div>
        </div>

        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}
