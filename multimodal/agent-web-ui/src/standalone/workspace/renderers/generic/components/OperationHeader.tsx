import React from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-4"
    >
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
          <motion.div
            initial={{ width: 0, x: 0 }}
            animate={{ width: '100%', x: ['0%', '100%'] }}
            transition={{
              duration: 1.5,
              width: { duration: 0 },
              x: { duration: 1.5, ease: 'easeInOut' },
            }}
            className="absolute top-0 left-0 h-full bg-accent-500 dark:bg-accent-400 rounded-full"
            style={{ width: '30%' }}
          />
        </div>
      </div>
    </motion.div>
  );
};
