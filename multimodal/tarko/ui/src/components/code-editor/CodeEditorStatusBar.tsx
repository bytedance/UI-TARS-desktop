import React from 'react';

interface CodeEditorStatusBarProps {
  code: string;
  readOnly?: boolean;
}

export const CodeEditorStatusBar: React.FC<CodeEditorStatusBarProps> = ({
  code,
  readOnly = true,
}) => {
  const lineCount = code.split('\n').length;
  const characterCount = code.length;

  return (
    <div className="code-editor-status-bar">
      <div className="code-editor-status-left">
        <span className="code-editor-status-item">{lineCount} lines</span>
        <span className="code-editor-status-item">{characterCount} characters</span>
      </div>
      <div className="code-editor-status-right">
        {readOnly && <span className="code-editor-status-item">Read-only</span>}
      </div>
    </div>
  );
};
