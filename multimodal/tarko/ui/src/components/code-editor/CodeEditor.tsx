import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { CodeEditorHeader } from './CodeEditorHeader';
import { CodeEditorStatusBar } from './CodeEditorStatusBar';
import { getDisplayFileName, getFileExtension } from '../../utils/file';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  readOnly?: boolean;
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
  showLineNumbers = true,
  maxHeight = 'none',
  className = '',
  onCopy,
}) => {
  if (!code) {
    return null;
  }

  const codeRef = useRef<HTMLElement>(null);

  const displayFileName = getDisplayFileName(fileName, filePath);
  const fileExtension = getFileExtension(fileName);
  const language = fileExtension || 'text';

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  };

  const lines = code.split('\n');

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        <CodeEditorHeader
          fileName={displayFileName}
          filePath={filePath}
          fileSize={fileSize}
          onCopy={handleCopy}
        />

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

            <div className="code-editor-code-area">
              <pre className="code-editor-pre">
                <code ref={codeRef} className={`language-${language} code-editor-code`}>
                  {code}
                </code>
              </pre>
            </div>
          </div>
        </div>

        <CodeEditorStatusBar code={code} readOnly={readOnly} />
      </div>
    </div>
  );
};
