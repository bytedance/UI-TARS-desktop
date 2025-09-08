import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { CodeEditorHeader } from './CodeEditorHeader';
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
  const lineCount = lines.length;
  const displayFileName = fileName || `script.${language}`;

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        <CodeEditorHeader
          fileName={displayFileName}
          filePath={filePath}
          fileSize={fileSize}
          language={language}
          onCopy={handleCopy}
        />

        <div className="code-editor-content" style={{ maxHeight }}>
          <div className="code-editor-inner">
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

            <div className="code-editor-code-area">
              <pre className="code-editor-pre">
                <code ref={codeRef} className={`language-${language} code-editor-code`}>
                  {code}
                </code>
              </pre>
            </div>
          </div>
        </div>

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
