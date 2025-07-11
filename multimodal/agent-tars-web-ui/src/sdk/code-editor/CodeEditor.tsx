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
 * Professional dark IDE-style code editor component
 *
 * NOTE: This component is designed specifically for code editing and viewing,
 * and should NOT be used for markdown rendering. MarkdownRenderer has its own
 * styling and theming system. The styles in this component are intentionally
 * scoped to avoid conflicts with MarkdownRenderer.
 *
 * Features:
 * - Dark IDE theme matching terminal UI style
 * - Syntax highlighting using highlight.js
 * - Line numbers display
 * - Copy functionality with enhanced file info tooltip
 * - Professional browser-like interface
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  fileName,
  filePath,
  fileSize,
  readOnly = true,
  showLineNumbers = true,
  maxHeight = 'none',
  className = '',
  onCopy,
}) => {
  if (!code) {
    return null;
  }
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Enhanced tooltip state management
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInfoRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current) {
      // Remove existing highlighting
      codeRef.current.removeAttribute('data-highlighted');

      // Apply new highlighting
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Enhanced tooltip interaction handlers
  const handleFileInfoEnter = () => {
    if (!filePath && !fileSize) return;

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Set show timeout for smooth interaction
    showTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  };

  const handleFileInfoLeave = () => {
    // Clear show timeout if still pending
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Set hide timeout to allow mouse movement to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  };

  const handleTooltipEnter = () => {
    // Clear hide timeout when mouse enters tooltip
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipLeave = () => {
    // Hide immediately when leaving tooltip
    setShowTooltip(false);
  };

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
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        {/* IDE-style header with dark theme */}
        <div className="code-editor-header">
          <div className="code-editor-header-left">
            {/* Browser-style control buttons */}
            <div className="code-editor-controls">
              <div className="code-editor-control-btn code-editor-control-red" />
              <div className="code-editor-control-btn code-editor-control-yellow" />
              <div className="code-editor-control-btn code-editor-control-green" />
            </div>

            {/* Enhanced file name with improved tooltip */}
            <div
              ref={fileInfoRef}
              className="code-editor-file-info"
              onMouseEnter={handleFileInfoEnter}
              onMouseLeave={handleFileInfoLeave}
            >
              <span className="code-editor-file-name">{displayFileName}</span>

              {/* Enhanced tooltip with better interaction */}
              {hasFileInfo && showTooltip && (
                <motion.div
                  ref={tooltipRef}
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="code-editor-tooltip"
                  onMouseEnter={handleTooltipEnter}
                  onMouseLeave={handleTooltipLeave}
                >
                  <div className="code-editor-tooltip-content">
                    {filePath && (
                      <div className="code-editor-tooltip-section">
                        <FiFolder className="code-editor-tooltip-icon" size={12} />
                        <div>
                          <div className="code-editor-tooltip-label">File Path</div>
                          <div className="code-editor-tooltip-value">{filePath}</div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopyPath}
                            className="code-editor-tooltip-btn"
                          >
                            {pathCopied ? <FiCheck size={10} /> : <FiCopy size={10} />}
                            {pathCopied ? 'Copied!' : 'Copy Path'}
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {fileSize && (
                      <div className="code-editor-tooltip-info">
                        <FiInfo className="code-editor-tooltip-icon" size={12} />
                        <div>
                          <span className="code-editor-tooltip-label">Size: </span>
                          <span className="code-editor-tooltip-value">{fileSize}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tooltip arrow */}
                  <div className="code-editor-tooltip-arrow" />
                </motion.div>
              )}
            </div>

            {/* Language badge */}
            <div className="code-editor-language-badge">{language}</div>
          </div>

          {/* Actions */}
          <div className="code-editor-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="code-editor-action-btn"
              title="Copy code"
            >
              {copied ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
            </motion.button>
          </div>
        </div>

        {/* Code content with dark IDE theme */}
        <div className="code-editor-content" style={{ maxHeight }}>
          <div className="code-editor-inner">
            {/* Line numbers */}
            {showLineNumbers && (
              <div className="code-editor-line-numbers">
                <div className="code-editor-line-numbers-inner">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i + 1} className="code-editor-line-number">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Code content */}
            <div className="code-editor-code-area">
              <pre className="code-editor-pre">
                <code ref={codeRef} className={`language-${language} code-editor-code`}>
                  {code}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* IDE-style status bar */}
        <div className="code-editor-status-bar">
          <div className="code-editor-status-left">
            <span className="code-editor-status-item">{lineCount} lines</span>
            <span className="code-editor-status-item">{code.length} characters</span>
          </div>
          <div className="code-editor-status-right">
            {readOnly && <span className="code-editor-status-item">Read-only</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
