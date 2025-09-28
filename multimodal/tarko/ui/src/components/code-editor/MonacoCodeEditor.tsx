import React, { useCallback, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { CodeEditorHeader } from './CodeEditorHeader';
import { CodeEditorStatusBar } from './CodeEditorStatusBar';
import { getMonacoLanguage, getDisplayFileName, getFileExtension } from '../../utils/file';
import './MonacoCodeEditor.css';

interface MonacoCodeEditorProps {
  code: string;
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  onCopy?: () => void;
  onChange?: (value: string | undefined) => void;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  code,
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

  const editorOptions = useMemo(
    (): editor.IStandaloneEditorConstructionOptions => ({
      readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: showLineNumbers ? 'on' : 'off',
      glyphMargin: false,
      folding: true,
      renderLineHighlight: 'gutter',
      selectionHighlight: false,
      occurrencesHighlight: 'off',
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

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.updateOptions({ theme: 'vs-dark' });
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  }, [code, onCopy]);

  const displayFileName = getDisplayFileName(fileName, filePath);
  const fileExtension = getFileExtension(fileName);
  const monacoLanguage = getMonacoLanguage(fileExtension);

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        <CodeEditorHeader
          fileName={displayFileName}
          filePath={filePath}
          fileSize={fileSize}
          onCopy={handleCopy}
        />

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

        <CodeEditorStatusBar code={code} readOnly={readOnly} />
      </div>
    </div>
  );
};
