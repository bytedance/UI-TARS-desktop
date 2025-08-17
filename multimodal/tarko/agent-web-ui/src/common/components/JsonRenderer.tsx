import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiCopy, FiCheck } from 'react-icons/fi';

/**
 * JsonRenderer - Universal JSON viewer component
 * 
 * Extracted from AgentConfigViewer for reusability across the application.
 * Supports hierarchical tree structure with smooth animations.
 */

interface JsonItemProps {
  label: string;
  value: any;
  level?: number;
  isRoot?: boolean;
}

const JsonItem: React.FC<JsonItemProps> = ({ label, value, level = 0, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const isObject = value && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isPrimitive = !isObject && !isArray;

  const indentClass = isRoot ? '' : `ml-${Math.min(level * 4, 16)}`;

  if (isPrimitive) {
    const displayValue = value === null ? 'null' : String(value);
    const valueColor = 
      typeof value === 'string' ? 'text-emerald-600 dark:text-emerald-400' :
      typeof value === 'number' ? 'text-blue-600 dark:text-blue-400' :
      typeof value === 'boolean' ? 'text-purple-600 dark:text-purple-400' :
      'text-gray-500 dark:text-gray-400';

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.02 }}
        className={`${indentClass} flex items-center justify-between group py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">:</span>
          <span className={`text-sm font-mono ${valueColor} truncate`}>
            {typeof value === 'string' ? `"${displayValue}"` : displayValue}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCopy(displayValue)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          title="Copy value"
        >
          {copied ? (
            <FiCheck size={12} className="text-green-500" />
          ) : (
            <FiCopy size={12} className="text-gray-400" />
          )}
        </motion.button>
      </motion.div>
    );
  }

  const itemCount = isArray ? value.length : Object.keys(value).length;
  const typeLabel = isArray ? `Array[${itemCount}]` : `Object{${itemCount}}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: level * 0.02 }}
      className={indentClass}
    >
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronRight size={14} className="text-gray-400" />
        </motion.div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          {typeLabel}
        </span>
      </motion.button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-2">
              {isArray ? (
                value.map((item: any, index: number) => (
                  <JsonItem
                    key={index}
                    label={`[${index}]`}
                    value={item}
                    level={level + 1}
                  />
                ))
              ) : (
                Object.entries(value).map(([key, val]) => (
                  <JsonItem
                    key={key}
                    label={key}
                    value={val}
                    level={level + 1}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface JsonRendererProps {
  data: any;
  className?: string;
  emptyMessage?: string;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({ 
  data, 
  className = '',
  emptyMessage = 'No data available'
}) => {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">📄</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const isRootObject = typeof data === 'object' && !Array.isArray(data);
  const isRootArray = Array.isArray(data);

  return (
    <div className={`space-y-1 ${className}`}>
      {isRootObject ? (
        Object.entries(data).map(([key, value]) => (
          <JsonItem key={key} label={key} value={value} isRoot />
        ))
      ) : isRootArray ? (
        data.map((item: any, index: number) => (
          <JsonItem key={index} label={`[${index}]`} value={item} isRoot />
        ))
      ) : (
        <JsonItem label="value" value={data} isRoot />
      )}
    </div>
  );
};
