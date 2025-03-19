import { planTasksAtom } from '@renderer/state/chat';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { PlanTaskStatus as TaskStatus } from '@renderer/type/agent';
import { Popover, PopoverTrigger, PopoverContent } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { FiClock, FiCheck, FiX } from 'react-icons/fi';

export function PlanTaskStatus() {
  const [planTasks] = useAtom(planTasksAtom);
  const [isOpen, setIsOpen] = useState(false);
  const completedTasks =
    planTasks?.filter((task) => task.status === TaskStatus.Done).length || 0;

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Done:
        return <FiCheck className="w-4 h-4" />;
      case TaskStatus.Doing:
        return <FiClock className="w-4 h-4 animate-spin" />;
      case TaskStatus.Skipped:
        return <FiX className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!planTasks?.length) return null;

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom"
      showArrow={true}
    >
      <PopoverTrigger>
        <div className="flex items-center w-[280px] px-4 py-2.5 bg-white/80 dark:bg-gray-900/50 rounded-xl border border-blue-100/80 dark:border-blue-500/20 shadow-sm dark:shadow-blue-900/10 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <FiClock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Plan Steps
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedTasks}/{planTasks.length} completed
            </span>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-blue-100/50 dark:border-blue-500/30">
        <div className="w-[320px] max-h-[400px] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Plan Progress
            </h3>
          </div>
          <div className="p-2">
            {planTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="px-3 py-2.5 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    ${
                      task.status === TaskStatus.Done
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : task.status === TaskStatus.Doing
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }
                  `}
                  >
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {task.title}
                    </p>
                    {task.error && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                        {task.error}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
