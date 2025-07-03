// /multimodal/agent-tars-web-ui/src/sdk/code-editor/CodeEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import hljs from 'highlight.js';

import { FiCopy, FiCheck, FiInfo, FiFolder } from 'react-icons/fi';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  language: string;
  fileName?: string;
  filePath?: string;
  fileSize?: string;
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


 * - Copy functionality with enhanced file info tooltip
 * - IDE-style interface with file path and size display
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  fileName,
  filePath,
  fileSize,
  readOnly = true,
  showLineNumbers = true,
  maxHeight = '400px',
  className = '',
  onCopy,
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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

  // Handle path copy functionality
  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filePath) {
      navigator.clipboard.writeText(filePath);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
    }
  };

  // Split code into lines for line numbers
  const lines = code.split('\n');
  const lineCount = lines.length;

  const displayFileName = fileName || `script.${language}`;
  const hasFileInfo = filePath || fileSize;

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

            {/* Enhanced file name with tooltip */}
            <div
              className="relative"
              onMouseEnter={() => hasFileInfo && setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-default">
                {displayFileName}
              </span>

              {/* Tooltip with file info */}
              {hasFileInfo && showTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 z-50 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg border border-gray-700/30 dark:border-gray-600/30 min-w-max max-w-md"
                >
                  <div className="p-3 space-y-2">
                    {filePath && (
                      <div className="flex items-start gap-2">
                        <FiFolder className="flex-shrink-0 mt-0.5 text-gray-400" size={12} />
                        <div>
                          <div className="text-gray-300 font-medium mb-1">File Path</div>
                          <div className="font-mono text-gray-200 break-all leading-relaxed">
                            {filePath}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopyPath}
                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 rounded text-xs transition-colors"
                          >
                            {pathCopied ? <FiCheck size={10} /> : <FiCopy size={10} />}
                            {pathCopied ? 'Copied!' : 'Copy Path'}
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {fileSize && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50 dark:border-gray-600/50">
                        <FiInfo className="flex-shrink-0 text-gray-400" size={12} />
                        <div>
                          <span className="text-gray-300 font-medium">Size: </span>
                          <span className="text-gray-200">{fileSize}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tooltip arrow */}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-t border-gray-700/30 dark:border-gray-600/30 transform rotate-45"></div>
                </motion.div>
              )}
            </div>
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
        </div>
      </div>

      {/* Code content */}
      <div className="relative overflow-auto" style={{ maxHeight }}>
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
