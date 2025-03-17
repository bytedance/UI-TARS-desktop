import { ActionStatus } from '@renderer/type/agent';
import { FiCheckCircle } from 'react-icons/fi';

export function DefaultTip({
  description,
}: {
  description?: string;
  status?: ActionStatus;
}) {
  return (
    <div className="w-full h-full flex flex-col gap-3 justify-center items-center text-gray-500 dark:text-gray-400">
      <FiCheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
      <p className="text-sm font-medium">Operation completed successfully</p>
      <p className="text-xs opacity-75">{description}</p>
    </div>
  );
}
