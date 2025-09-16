import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiFolder, FiX, FiHome, FiAlertTriangle } from 'react-icons/fi';
import { ContextualItem } from './ContextualSelector';
import { apiService } from '@/common/services/apiService';
import { useSession } from '@/common/hooks/useSession';

interface ContextualTagsProps {
  items: ContextualItem[];
  onRemove: (id: string) => void;
}

interface PathValidation {
  [path: string]: {
    exists: boolean;
    type?: 'file' | 'directory';
    error?: string;
  };
}

export const ContextualTags: React.FC<ContextualTagsProps> = ({ items, onRemove }) => {
  const { activeSessionId } = useSession();
  const [pathValidation, setPathValidation] = useState<PathValidation>({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!activeSessionId || items.length === 0) {
      setPathValidation({});
      return;
    }

    const validatePaths = async () => {
      setIsValidating(true);
      try {
        const pathsToValidate = items
          .filter((item) => item.type !== 'workspace')
          .map((item) => item.relativePath);

        if (pathsToValidate.length > 0) {
          const results = await apiService.validateWorkspacePaths(activeSessionId, pathsToValidate);
          const validationMap: PathValidation = {};

          results.forEach((result) => {
            validationMap[result.path] = {
              exists: result.exists,
              type: result.type,
              error: result.error,
            };
          });

          setPathValidation(validationMap);
        }
      } catch (error) {
        console.error('Failed to validate paths:', error);
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validatePaths, 300);
    return () => clearTimeout(debounceTimer);
  }, [items, activeSessionId]);

  if (items.length === 0) return null;

  const getItemIcon = (item: ContextualItem) => {
    const validation = pathValidation[item.relativePath];
    const isInvalid = validation && !validation.exists;

    if (isInvalid) {
      return <FiAlertTriangle size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />;
    }

    switch (item.type) {
      case 'workspace':
        return <FiHome size={14} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />;
      case 'directory':
        return <FiFolder size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />;
      default:
        return <FiFile size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />;
    }
  };

  const getDisplayText = (item: ContextualItem) => {
    if (item.type === 'workspace') {
      return {
        name: 'workspace',
        path: 'Current workspace root',
        status: null,
      };
    } else {
      const validation = pathValidation[item.relativePath];
      let status = null;

      if (isValidating) {
        status = 'Validating...';
      } else if (validation && !validation.exists) {
        status = validation.error || 'Path not found';
      }

      return {
        name: item.name,
        path: `${item.type === 'directory' ? '@dir:' : '@file:'}${item.relativePath}`,
        status,
      };
    }
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {items.map((item) => {
            const displayText = getDisplayText(item);
            const validation = pathValidation[item.relativePath];
            const isInvalid = validation && !validation.exists;
            const uniqueId = item.id;

            return (
              <motion.div
                {...{ ['key']: uniqueId }}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                whileHover={{ scale: 1.02 }}
                className={`flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg shadow-sm backdrop-blur-sm group ${
                  isInvalid
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                    : 'border-gray-200/60 dark:border-gray-700/40'
                }`}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {getItemIcon(item)}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-sm font-medium truncate ${
                        isInvalid
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {displayText.name}
                    </span>
                    <span
                      className={`text-xs truncate ${
                        isInvalid
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {displayText.status || displayText.path}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemove(item.id)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                  title={isInvalid ? 'Remove invalid context' : 'Remove context'}
                >
                  <FiX size={14} />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
