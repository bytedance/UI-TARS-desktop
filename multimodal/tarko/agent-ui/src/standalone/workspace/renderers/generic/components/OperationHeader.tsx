import React from 'react';
import { FiCornerUpRight, FiGlobe } from 'react-icons/fi';
import { ResultType, OperationType } from '../types';

interface OperationHeaderProps {
  title: string;
  url?: string;
  operationType?: OperationType;
  resultType: ResultType;
}

export const OperationHeader: React.FC<OperationHeaderProps> = ({
  title,
  url,
  operationType,
  resultType,
}) => {
  if (!operationType || operationType !== 'navigate' || resultType !== 'success') {
    return null;
  }

  return (
    <div className="mb-4 animate-in slide-in-from-top-2 fade-in duration-500">
      <div className="flex items-center mt-1">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <FiCornerUpRight className="text-accent-500 dark:text-accent-400" size={16} />
        </div>
        <div className="ml-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">Navigated to</div>
          <div className="font-medium text-accent-600 dark:text-accent-400 flex items-center">
            {url}
          </div>
        </div>
      </div>

      <div className="my-5 px-3">
        <div className="relative h-0.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-full bg-accent-500 dark:bg-accent-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
