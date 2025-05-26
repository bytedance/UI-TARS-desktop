import React, { useState } from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiCopy } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JSONRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders JSON content with syntax highlighting and expansion
 */
export const JSONRenderer: React.FC<JSONRendererProps> = ({ part }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, name } = part;

  if (!data) {
    return <div className="text-gray-500 italic">JSON data missing</div>;
  }

  // Format JSON data for display
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  // For large JSON data, initially show a preview
  const isLarge = jsonString.length > 500;
  const displayJson = isLarge && !expanded ? jsonString.substring(0, 500) + '...' : jsonString;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100/50 dark:border-gray-700/30">
        <div className="font-medium text-gray-700 dark:text-gray-300">{name || 'JSON Data'}</div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md hover:bg-gray-100/60 dark:hover:bg-gray-700/40"
            title={copied ? 'Copied!' : 'Copy JSON'}
          >
            <FiCopy size={14} />
          </motion.button>

          {isLarge && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md hover:bg-gray-100/60 dark:hover:bg-gray-700/40"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </motion.button>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[500px]">
        <SyntaxHighlighter
          language="json"
          style={tomorrow}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'transparent',
            fontSize: '0.875rem',
          }}
        >
          {displayJson}
        </SyntaxHighlighter>
      </div>

      {isLarge && !expanded && (
        <div
          className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100/50 dark:border-gray-700/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/30"
          onClick={() => setExpanded(true)}
        >
          Click to show all {jsonString.length} characters
        </div>
      )}
    </div>
  );
};
