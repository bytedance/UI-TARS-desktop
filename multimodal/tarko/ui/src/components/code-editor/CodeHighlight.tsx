import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { getFileExtension } from '../../utils/file';
import './CodeEditor.css';

interface CodeHighlightProps {
  code: string;
  fileName?: string;
  language?: string;
  className?: string;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  fileName,
  language,
  className = '',
}) => {
  const codeRef = useRef<HTMLElement>(null);

  const detectedLanguage = language || getFileExtension(fileName) || 'text';

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, detectedLanguage]);

  if (!code) {
    return null;
  }

  return (
    <div className={`code-editor-code-area ${className}`}>
      <pre className="code-editor-pre">
        <code ref={codeRef} className={`language-${detectedLanguage} code-editor-code`}>
          {code}
        </code>
      </pre>
    </div>
  );
};
