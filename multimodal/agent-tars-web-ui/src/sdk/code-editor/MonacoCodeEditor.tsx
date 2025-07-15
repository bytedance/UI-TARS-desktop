import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { FiCopy, FiCheck, FiInfo, FiFolder } from 'react-icons/fi';
import './MonacoCodeEditor.css';

interface MonacoCodeEditorProps {
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
  onChange?: (value: string) => void;
}

/**
 * Monaco Editor wrapper component with enhanced UI
 *
 * Features:
 * - VS Code editor experience with stable syntax highlighting
 * - Professional dark theme matching terminal UI style
 * - Enhanced file info tooltip with better UX
 * - Optimized performance with minimal re-renders
 * - Support for real-time content updates without flickering
 */
export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
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
  onChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Timeout refs for tooltip management
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Monaco editor configuration
  const editorOptions = useMemo(
    (): editor.IStandaloneEditorConstructionOptions => ({
      readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: showLineNumbers ? 'on' : 'off',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'gutter',
      selectionHighlight: false,
      occurrencesHighlight: false,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      renderValidationDecorations: 'off',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      automaticLayout: true,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    }),
    [readOnly, showLineNumbers],
  );

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Configure editor theme for consistency
    editor.updateOptions({
      theme: 'vs-dark',
    });
  }, []);

  // Enhanced tooltip interaction handlers
  const handleFileInfoEnter = useCallback(() => {
    if (!filePath && !fileSize) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    showTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  }, [filePath, fileSize]);

  const handleFileInfoLeave = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Handle copy functionality
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [code, onCopy]);

  // Handle path copy functionality
  const handleCopyPath = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (filePath) {
        navigator.clipboard.writeText(filePath);
        setPathCopied(true);
        setTimeout(() => setPathCopied(false), 2000);
      }
    },
    [filePath],
  );

  // Get Monaco language identifier
  const getMonacoLanguage = useCallback((lang: string): string => {
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      js: 'javascript',
      jsx: 'javascript',
      typescript: 'typescript',
      ts: 'typescript',
      tsx: 'typescript',
      python: 'python',
      py: 'python',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      markdown: 'markdown',
      md: 'markdown',
      bash: 'shell',
      sh: 'shell',
      sql: 'sql',
      php: 'php',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      go: 'go',
      rust: 'rust',
    };

    return languageMap[lang.toLowerCase()] || 'plaintext';
  }, []);

  const displayFileName = fileName || `script.${language}`;
  const hasFileInfo = filePath || fileSize;
  const monacoLanguage = getMonacoLanguage(language);

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        {/* IDE-style header */}
        <div className="code-editor-header">
          <div className="code-editor-header-left">
            {/* Browser-style control buttons */}
            <div className="code-editor-controls">
              <div className="code-editor-control-btn code-editor-control-red" />
              <div className="code-editor-control-btn code-editor-control-yellow" />
              <div className="code-editor-control-btn code-editor-control-green" />
            </div>

            {/* File name with tooltip */}
            <div
              className="code-editor-file-info"
              onMouseEnter={handleFileInfoEnter}
              onMouseLeave={handleFileInfoLeave}
            >
              <span className="code-editor-file-name">{displayFileName}</span>

              {/* Enhanced tooltip */}
              {hasFileInfo && showTooltip && (
                <motion.div
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

        {/* Monaco Editor */}
        <div
          className="code-editor-monaco-container"
          style={{ height: maxHeight !== 'none' ? maxHeight : '400px' }}
        >
          <Editor
            value={code}
            language={monacoLanguage}
            theme="vs-dark"
            options={editorOptions}
            onMount={handleEditorDidMount}
            onChange={onChange}
            loading={
              <div className="flex items-center justify-center h-full bg-[#0d1117] text-gray-400">
                <div className="text-sm">Loading editor...</div>
              </div>
            }
          />
        </div>

        {/* Status bar */}
        <div className="code-editor-status-bar">
          <div className="code-editor-status-left">
            <span className="code-editor-status-item">{code.split('\n').length} lines</span>
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
