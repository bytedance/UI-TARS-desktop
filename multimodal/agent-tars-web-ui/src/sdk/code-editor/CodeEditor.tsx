// /multimodal/agent-tars-web-ui/src/sdk/code-editor/CodeEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import hljs from 'highlight.js';
import { FiCopy, FiCheck, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  language: string;
  fileName?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  onCopy?: () => void;
}

/**
 * Professional lightweight code editor component
 *
 * Features:
 * - Syntax highlighting using highlight.js
 * - Line numbers display
 * - Copy functionality
 * - Expandable/collapsible view
 * - IDE-style interface
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  fileName,
  readOnly = true,
  showLineNumbers = true,
  maxHeight = '400px',
  className = '',
  onCopy,
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current) {
      // Remove existing highlighting
      codeRef.current.removeAttribute('data-highlighted');

      // Apply new highlighting
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  // Handle copy functionality
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  // Split code into lines for line numbers
  const lines = code.split('\n');
  const lineCount = lines.length;

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200/70 dark:border-gray-700/40 overflow-hidden shadow-sm ${className}`}
    >
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/90 border-b border-gray-200/60 dark:border-gray-700/30">
        <div className="flex items-center">
          {/* File indicator */}
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-green-400 mr-2 shadow-sm" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {fileName || `script.${language}`}
            </span>
          </div>

          {/* Language badge */}
          <div className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/70 rounded text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {language}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 transition-colors"
            title="Copy code"
          >
            {copied ? <FiCheck size={14} className="text-green-500" /> : <FiCopy size={14} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleExpanded}
            className="p-1.5 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
          </motion.button>
        </div>
      </div>

      {/* Code content */}
      <div
        className="relative overflow-auto"
        style={{
          maxHeight: isExpanded ? 'none' : maxHeight,
          height: isExpanded ? 'auto' : undefined,
        }}
      >
        <div className="flex min-h-full">
          {/* Line numbers */}
          {showLineNumbers && (
            <div className="flex-shrink-0 px-3 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-r border-gray-200/50 dark:border-gray-700/30 select-none">
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 leading-6">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i + 1} className="text-right min-w-[2rem]">
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code content */}
          <div className="flex-1 overflow-auto">
            <pre className="p-4 text-sm leading-6 font-mono">
              <code
                ref={codeRef}
                className={`language-${language} text-gray-800 dark:text-gray-200`}
                style={{ background: 'transparent' }}
              >
                {code}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50/80 dark:bg-gray-800/90 border-t border-gray-200/60 dark:border-gray-700/30 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>{lineCount} lines</span>
          <span>{code.length} characters</span>
        </div>
        <div>{readOnly && <span>Read-only</span>}</div>
      </div>
    </div>
  );
};
