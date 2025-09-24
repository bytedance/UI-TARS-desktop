import React from 'react';
import { CodeEditorHeader } from './CodeEditorHeader';
import { CodeEditorStatusBar } from './CodeEditorStatusBar';
import { CodeHighlight } from './CodeHighlight';
import { getDisplayFileName } from '../../utils/file';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  readOnly?: boolean;
  showHeader?: boolean;
  showStatusBar?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  onCopy?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  fileName,
  filePath,
  fileSize,
  readOnly = true,
  showHeader = true,
  showLineNumbers = true,
  showStatusBar = true,
  maxHeight = 'none',
  className = '',
  onCopy,
}) => {
  if (!code) {
    return null;
  }

  const displayFileName = getDisplayFileName(fileName, filePath);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  };

  const lines = code.split('\n');

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        {showHeader && (
          <CodeEditorHeader
            fileName={displayFileName}
            filePath={filePath}
            fileSize={fileSize}
            onCopy={handleCopy}
          />
        )}

        <div className="code-editor-content" style={{ maxHeight }}>
          <div className="code-editor-inner">
            {showLineNumbers && (
              <div className="code-editor-line-numbers">
                <div className="code-editor-line-numbers-inner">
                  {Array.from({ length: lines.length }, (_, i) => (
                    <div key={i + 1} className="code-editor-line-number">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CodeHighlight code={code} fileName={fileName} />
          </div>
        </div>
        {showStatusBar && <CodeEditorStatusBar code={code} readOnly={readOnly} />}
      </div>
    </div>
  );
};
