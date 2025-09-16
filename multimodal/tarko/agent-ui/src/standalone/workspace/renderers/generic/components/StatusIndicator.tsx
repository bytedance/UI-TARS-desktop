import React from 'react';
import { FiCheck, FiInfo } from 'react-icons/fi';
import { ResultType, OperationType } from '../types';
import { getOperationDescription } from '../utils';

interface StatusIndicatorProps {
  type: ResultType;
  operation?: OperationType;
  details?: Record<string, any>;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  operation,
  details = {},
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex flex-col items-center animate-in zoom-in fade-in duration-500 delay-200">
        {type === 'success' ? (
          <>
            <div className="w-12 h-12 mb-3 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 dark:text-green-400">
              <div className="animate-pulse">
                <FiCheck size={24} />
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                The operation completed successfully
              </div>
              {operation && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getOperationDescription(operation, { type, details })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <FiInfo size={24} />
            </div>
            <div className="text-center text-gray-500 dark:text-gray-400">
              {type === 'empty' ? 'No content available' : 'Operation completed'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
