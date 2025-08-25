import React, { useCallback, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { CodeEditorHeader } from './CodeEditorHeader';
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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  // Handle copy functionality
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  }, [code, onCopy]);

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
  const monacoLanguage = getMonacoLanguage(language);

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        {/* IDE-style header */}
        <CodeEditorHeader
          fileName={displayFileName}
          filePath={filePath}
          fileSize={fileSize}
          language={language}
          onCopy={handleCopy}
          copyButtonTitle="Copy code"
        />

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
