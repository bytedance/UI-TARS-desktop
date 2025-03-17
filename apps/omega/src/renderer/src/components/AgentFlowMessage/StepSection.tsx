import { useState } from 'react';
import { EventItem } from '@renderer/type/event';
import { PlanTask, PlanTaskStatus } from '@renderer/type/agent';
import { CheckCircle, Loader2 } from 'lucide-react';
import { HiOutlineChevronUpDown } from 'react-icons/hi2';
import { EventRenderer } from './EventRenderer';

interface StepSectionProps {
  step: number;
  events: EventItem[];
  isCurrentStep: boolean;
  planTasks: PlanTask[];
  isContinuation?: boolean;
}

export function StepSection({
  step,
  events,
  isCurrentStep,
  planTasks,
  isContinuation = false,
}: StepSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const stepInfo = planTasks[step - 1];

  if (!stepInfo) {
    console.error('Step info not found for step:', step);
    return null;
  }

  const { status, title } = stepInfo;
  const isSingleTask = planTasks.length === 1;

  return (
    <div
      className={`mb-4 rounded-xl overflow-auto border transition-all duration-300 ease-in-out ${
        isCurrentStep
          ? 'border-blue-400/40 dark:border-blue-500/40 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20'
          : 'border-gray-200/60 dark:border-gray-700/60 shadow-md'
      } bg-white dark:bg-gray-800`}
    >
      <div
        className={`flex flex-col px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 ${
          !isSingleTask &&
          'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750'
        } transition-colors duration-200`}
        onClick={() => !isSingleTask && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between w-full">
          {!isSingleTask && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
              Step {step}
              {isContinuation && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50 transition-all duration-300 ease-in-out hover:bg-blue-100 dark:hover:bg-blue-900/40">
                  <svg
                    className="w-3 h-3 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17 2L21 6M21 6L17 10M21 6H8C5.79086 6 4 7.79086 4 10V10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 22L3 18M3 18L7 14M3 18H16C18.2091 18 20 16.2091 20 14V14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Continue
                </span>
              )}
            </span>
          )}
          {!isSingleTask && (
            <HiOutlineChevronUpDown
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-opacity duration-200 ${
                isExpanded ? 'opacity-70' : 'opacity-40'
              }`}
            />
          )}
        </div>
        <div
          className={`flex items-center justify-between ${isSingleTask ? '' : 'mt-2'}`}
        >
          <span className="font-medium text-gray-800 dark:text-gray-100">
            {title}
          </span>
          <div className="flex items-center ml-4">
            {status === PlanTaskStatus.Done && (
              <CheckCircle
                size={18}
                className="text-green-500/90 dark:text-green-400/90"
              />
            )}
            {status === PlanTaskStatus.Doing && (
              <Loader2
                size={18}
                className="text-blue-500/90 dark:text-blue-400/90 animate-spin"
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isSingleTask || isExpanded
            ? 'max-h-none opacity-100'
            : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="py-2 pr-2">
          {events.map((event, index) => (
            <EventRenderer
              key={event.id + index}
              event={event}
              isLastEvent={index === events.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
