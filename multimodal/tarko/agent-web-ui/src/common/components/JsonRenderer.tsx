import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiCopy, FiCheck, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

/**
 * JsonRenderer - Universal JSON viewer component
 *
 * Extracted from AgentConfigViewer for reusability across the application.
 * Supports hierarchical tree structure with smooth animations.
 */

// Shared copy hook
const useCopy = () => {
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
  
  return { copied, handleCopy };
};

// Shared copy button component
const CopyButton: React.FC<{
  onCopy: () => void;
  copied: boolean;
  title?: string;
  size?: number;
  className?: string;
}> = ({ onCopy, copied, title = 'Copy', size = 12, className = '' }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onCopy}
    className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${className}`}
    title={title}
  >
    {copied ? (
      <FiCheck size={size} className="text-green-500" />
    ) : (
      <FiCopy size={size} className="text-gray-400" />
    )}
  </motion.button>
);

interface JsonItemProps {
  label: string;
  value: any;
  level?: number;
  isRoot?: boolean;
}

const JsonItem: React.FC<JsonItemProps> = ({ label, value, level = 0, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(level <= 1); // Expand root and first level
  const [isStringExpanded, setIsStringExpanded] = useState(false);
  const { copied, handleCopy } = useCopy();

  const isObject = value && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isPrimitive = !isObject && !isArray;

  const indentClass = isRoot ? '' : `ml-${Math.min(level * 4, 16)}`;

  if (isPrimitive) {
    const displayValue = value === null ? 'null' : String(value);
    const valueColor =
      typeof value === 'string'
        ? 'text-emerald-600 dark:text-emerald-400'
        : typeof value === 'number'
          ? 'text-blue-600 dark:text-blue-400'
          : typeof value === 'boolean'
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400';

    const isLongString = typeof value === 'string' && displayValue.length > 100;
    const shouldTruncateValue = !isStringExpanded && isLongString;
    const truncatedValue = shouldTruncateValue ? displayValue.slice(0, 100) + '...' : displayValue;
    const formattedValue = typeof value === 'string' ? `"${truncatedValue}"` : truncatedValue;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.02 }}
        className={`${indentClass} group py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-shrink-0">
              {label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">:</span>
            <div className="flex-1 min-w-0">
              {isStringExpanded ? (
                <pre className={`text-sm font-mono ${valueColor} whitespace-pre-wrap break-words`}>
                  {typeof value === 'string' ? `"${displayValue}"` : displayValue}
                </pre>
              ) : (
                <span className={`text-sm font-mono ${valueColor} break-words`}>
                  {formattedValue}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {isLongString && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsStringExpanded(!isStringExpanded)}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                title={isStringExpanded ? 'Collapse' : 'Expand'}
              >
                {isStringExpanded ? (
                  <FiMinimize2 size={12} className="text-gray-400" />
                ) : (
                  <FiMaximize2 size={12} className="text-gray-400" />
                )}
              </motion.button>
            )}
            <CopyButton
              onCopy={() => handleCopy(displayValue)}
              copied={copied}
              title="Copy value"
            />
          </div>
        </div>
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
        className="w-full flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 group"
      >
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronRight size={14} className="text-gray-400" />
        </motion.div>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
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
            <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {isArray
                ? value.map((item: any, index: number) => (
                    <JsonItem
                      key={`item-${index}`}
                      label={`[${index}]`}
                      value={item}
                      level={level + 1}
                    />
                  ))
                : Object.entries(value).map(([itemKey, val]) => (
                    <JsonItem key={itemKey} label={itemKey} value={val} level={level + 1} />
                  ))}
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

export interface JsonRendererRef {
  copyAll: () => string;
}

export const JsonRenderer = React.forwardRef<JsonRendererRef, JsonRendererProps>((
  { data, className = '', emptyMessage = 'No data available' },
  ref
) => {
  React.useImperativeHandle(ref, () => ({
    copyAll: () => JSON.stringify(data, null, 2)
  }), [data]);

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
    <div className={`space-y-2 ${className}`}>
      {isRootObject ? (
        Object.entries(data).map(([itemKey, value]) => (
          <JsonItem key={itemKey} label={itemKey} value={value} isRoot />
        ))
      ) : isRootArray ? (
        data.map((item: any, index: number) => (
          <JsonItem key={`root-${index}`} label={`[${index}]`} value={item} isRoot />
        ))
      ) : (
        <JsonItem label="value" value={data} isRoot />
      )}
    </div>
  );
});
